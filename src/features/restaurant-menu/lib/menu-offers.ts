import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type {
  MenuOffer,
  MenuOfferCartLine,
  MenuOfferEvaluation,
  MenuOfferItemMap,
  MenuOffersEvaluationResult,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface EvaluateMenuOffersInput {
  offers: MenuOffer[];
  cartLines: MenuOfferCartLine[];
  itemNameById?: Map<string, string> | Record<string, string>;
}

interface OfferUnit {
  itemId: string;
  name: string;
  price: number;
}

interface DraftOfferEvaluation {
  offerId: string;
  offerName: string;
  headline: string;
  description: string;
  helperText: string;
  statusLabel: string;
  discountAmount: number;
  isEligible: boolean;
  isBestOffer: boolean;
  matchedItemIds: string[];
  missingSpend: number;
}

export function evaluateMenuOffers({
  offers,
  cartLines,
  itemNameById,
}: EvaluateMenuOffersInput): MenuOffersEvaluationResult {
  const subtotal = roundCurrency(
    cartLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
  const draftEvaluations = offers
    .map((offer) => evaluateMenuOffer(offer, cartLines, subtotal, itemNameById))
    .sort((left, right) => {
      if (left.isEligible !== right.isEligible) {
        return left.isEligible ? -1 : 1;
      }

      if (left.discountAmount !== right.discountAmount) {
        return right.discountAmount - left.discountAmount;
      }

      if (left.missingSpend !== right.missingSpend) {
        return left.missingSpend - right.missingSpend;
      }

      return left.offerName.localeCompare(right.offerName);
    });

  const bestOfferId =
    draftEvaluations.find((offer) => offer.isEligible)?.offerId ?? null;

  const evaluations = draftEvaluations.map((offer) => {
    const isBestOffer = bestOfferId === offer.offerId;
    return {
      offerId: offer.offerId,
      offerName: offer.offerName,
      headline: offer.headline,
      description: offer.description,
      helperText: offer.helperText,
      statusLabel: isBestOffer
        ? 'Best offer'
        : offer.isEligible
          ? 'Available now'
          : 'Unlock next',
      discountAmount: offer.discountAmount,
      isEligible: offer.isEligible,
      isBestOffer,
      matchedItemIds: offer.matchedItemIds,
    } satisfies MenuOfferEvaluation;
  });

  return {
    offers: evaluations,
    bestOffer: evaluations.find((offer) => offer.isBestOffer) ?? null,
  };
}

function evaluateMenuOffer(
  offer: MenuOffer,
  cartLines: MenuOfferCartLine[],
  subtotal: number,
  itemNameById?: Map<string, string> | Record<string, string>,
): DraftOfferEvaluation {
  const offerName = offer.name.trim() || buildOfferHeadline(offer, itemNameById);
  const headline = offerName;
  const description = buildOfferDescription(offer, itemNameById);
  const minimumSpend = currency(offer.minSpend);
  const missingSpend = roundCurrency(Math.max(minimumSpend - subtotal, 0));

  let discountAmount = 0;
  let helperText =
    missingSpend > 0
      ? `Add ${formatPrice(missingSpend)} more to unlock this offer.`
      : 'Add eligible items to unlock this offer.';
  let matchedItemIds: string[] = [];

  switch (`${offer.type}:${offer.subType ?? ''}`) {
    case 'percentage_off:total_order_value': {
      if (subtotal > 0 && subtotal >= minimumSpend) {
        discountAmount = roundCurrency(
          subtotal * (clampPercentage(offer.percentageOff) / 100),
        );
        helperText = `Automatically saves ${formatPrice(discountAmount)} at checkout.`;
      }
      break;
    }
    case 'amount_off:total_order_value': {
      if (subtotal > 0 && subtotal >= minimumSpend) {
        discountAmount = clampDiscount(currency(offer.amountOff), subtotal);
        helperText = `Automatically saves ${formatPrice(discountAmount)} at checkout.`;
      }
      break;
    }
    case 'percentage_off:selected_items': {
      const eligibleUnits = getEligibleUnits(cartLines, offer.discountedItems);
      matchedItemIds = uniqueItemIds(eligibleUnits);

      if (missingSpend > 0) {
        break;
      }

      if (!eligibleUnits.length) {
        helperText = `Add ${describeItemSet(offer.discountedItems, itemNameById, 'eligible items')} to unlock this offer.`;
        break;
      }

      discountAmount = roundCurrency(
        eligibleUnits.reduce(
          (sum, unit) => sum + unit.price * (clampPercentage(offer.percentageOff) / 100),
          0,
        ),
      );
      helperText = `Eligible items save ${formatPrice(discountAmount)} automatically.`;
      break;
    }
    case 'amount_off:selected_items': {
      const eligibleUnits = getEligibleUnits(cartLines, offer.discountedItems);
      matchedItemIds = uniqueItemIds(eligibleUnits);

      if (missingSpend > 0) {
        break;
      }

      if (!eligibleUnits.length) {
        helperText = `Add ${describeItemSet(offer.discountedItems, itemNameById, 'eligible items')} to unlock this offer.`;
        break;
      }

      const amountOff = currency(offer.amountOff);
      discountAmount = roundCurrency(
        eligibleUnits.reduce((sum, unit) => sum + Math.min(amountOff, unit.price), 0),
      );
      helperText = `Eligible items save ${formatPrice(discountAmount)} automatically.`;
      break;
    }
    case 'buy_1_get_1:buy_1_get_1_half_price': {
      const qualifyingUnits = getEligibleUnits(cartLines, offer.qualifyingItems);
      matchedItemIds = uniqueItemIds(qualifyingUnits);

      if (missingSpend > 0) {
        break;
      }

      if (qualifyingUnits.length < 2) {
        helperText = qualifyingUnits.length
          ? 'Add 1 more eligible item to unlock this offer.'
          : `Add ${describeItemSet(offer.qualifyingItems, itemNameById, 'eligible items')} to unlock this offer.`;
        break;
      }

      const discountedUnits = [...qualifyingUnits]
        .sort((left, right) => left.price - right.price)
        .slice(0, Math.floor(qualifyingUnits.length / 2));
      discountAmount = roundCurrency(
        discountedUnits.reduce((sum, unit) => sum + unit.price * 0.5, 0),
      );
      helperText = `The cheapest eligible items are 50% off, saving ${formatPrice(discountAmount)}.`;
      break;
    }
    case 'buy_1_get_1:buy_1_get_1_free':
    case 'free_item:by_buying_another_item': {
      const qualifyingUnits = getEligibleUnits(cartLines, offer.qualifyingItems);
      const freeUnits = getEligibleUnits(cartLines, offer.freeItems);
      matchedItemIds = uniqueItemIds([...qualifyingUnits, ...freeUnits]);

      if (missingSpend > 0) {
        break;
      }

      if (!qualifyingUnits.length) {
        helperText = `Add ${describeItemSet(offer.qualifyingItems, itemNameById, 'qualifying items')} to start this offer.`;
        break;
      }

      if (!freeUnits.length) {
        helperText = `Add ${describeItemSet(offer.freeItems, itemNameById, 'free items')} to claim this offer.`;
        break;
      }

      const discountedUnits = [...freeUnits]
        .sort((left, right) => left.price - right.price)
        .slice(0, Math.min(qualifyingUnits.length, freeUnits.length));
      discountAmount = roundCurrency(
        discountedUnits.reduce((sum, unit) => sum + unit.price, 0),
      );
      helperText = `The cheapest eligible free items are covered automatically, saving ${formatPrice(discountAmount)}.`;
      break;
    }
    case 'free_item:by_spending_fixed_amount': {
      const freeUnits = getEligibleUnits(cartLines, offer.freeItems);
      matchedItemIds = uniqueItemIds(freeUnits);

      if (missingSpend > 0) {
        break;
      }

      if (!freeUnits.length) {
        helperText = `Add ${describeItemSet(offer.freeItems, itemNameById, 'eligible reward items')} to claim this offer.`;
        break;
      }

      const cheapestUnit = [...freeUnits].sort(
        (left, right) => left.price - right.price,
      )[0];
      discountAmount = roundCurrency(cheapestUnit?.price ?? 0);
      helperText = `The cheapest eligible reward item is free, saving ${formatPrice(discountAmount)}.`;
      break;
    }
    default: {
      helperText = 'This offer is not configured for automatic checkout discounts yet.';
      break;
    }
  }

  discountAmount = clampDiscount(discountAmount, subtotal);

  return {
    offerId: offer.id,
    offerName,
    headline,
    description,
    helperText,
    statusLabel: 'Unlock next',
    discountAmount,
    isEligible: discountAmount > 0,
    isBestOffer: false,
    matchedItemIds,
    missingSpend,
  };
}

function buildOfferHeadline(
  offer: MenuOffer,
  itemNameById?: Map<string, string> | Record<string, string>,
) {
  const selectedSummary = describeItemSet(
    offer.discountedItems,
    itemNameById,
    'selected items',
  );
  const qualifyingSummary = describeItemSet(
    offer.qualifyingItems,
    itemNameById,
    'eligible items',
  );
  const freeSummary = describeItemSet(
    offer.freeItems,
    itemNameById,
    'reward items',
  );

  switch (`${offer.type}:${offer.subType ?? ''}`) {
    case 'percentage_off:total_order_value':
      return `${stripTrailingZeros(clampPercentage(offer.percentageOff))}% off your order`;
    case 'amount_off:total_order_value':
      return `${formatPrice(currency(offer.amountOff))} off your order`;
    case 'percentage_off:selected_items':
      return `${stripTrailingZeros(clampPercentage(offer.percentageOff))}% off ${selectedSummary}`;
    case 'amount_off:selected_items':
      return `${formatPrice(currency(offer.amountOff))} off ${selectedSummary}`;
    case 'buy_1_get_1:buy_1_get_1_half_price':
      return `Buy 1 get 1 half off on ${qualifyingSummary}`;
    case 'buy_1_get_1:buy_1_get_1_free':
      return `Buy 1 ${qualifyingSummary}, get ${freeSummary} free`;
    case 'free_item:by_buying_another_item':
      return `Free ${freeSummary} with ${qualifyingSummary}`;
    case 'free_item:by_spending_fixed_amount':
      return `Free ${freeSummary} over ${formatPrice(currency(offer.minSpend))}`;
    default:
      return offer.name.trim() || 'Restaurant offer';
  }
}

function buildOfferDescription(
  offer: MenuOffer,
  itemNameById?: Map<string, string> | Record<string, string>,
) {
  const minimumSpend = currency(offer.minSpend);
  const selectedSummary = describeItemSet(
    offer.discountedItems,
    itemNameById,
    'selected items',
  );
  const qualifyingSummary = describeItemSet(
    offer.qualifyingItems,
    itemNameById,
    'eligible items',
  );
  const freeSummary = describeItemSet(
    offer.freeItems,
    itemNameById,
    'reward items',
  );

  switch (`${offer.type}:${offer.subType ?? ''}`) {
    case 'percentage_off:total_order_value':
      return minimumSpend > 0
        ? `Auto-applies when your subtotal reaches ${formatPrice(minimumSpend)}.`
        : 'Auto-applies to the whole order.';
    case 'amount_off:total_order_value':
      return minimumSpend > 0
        ? `Auto-applies when your subtotal reaches ${formatPrice(minimumSpend)}.`
        : 'Auto-applies to the whole order.';
    case 'percentage_off:selected_items':
      return `Applies only to ${selectedSummary}.`;
    case 'amount_off:selected_items':
      return `Takes ${formatPrice(currency(offer.amountOff))} off each eligible ${selectedSummary}.`;
    case 'buy_1_get_1:buy_1_get_1_half_price':
      return `Pairs eligible ${qualifyingSummary} and discounts the cheapest one in each pair.`;
    case 'buy_1_get_1:buy_1_get_1_free':
      return `Each qualifying ${qualifyingSummary} can unlock one ${freeSummary}.`;
    case 'free_item:by_buying_another_item':
      return `Buy ${qualifyingSummary} and the cheapest eligible ${freeSummary} becomes free.`;
    case 'free_item:by_spending_fixed_amount':
      return `Spend ${formatPrice(minimumSpend)} and the cheapest eligible ${freeSummary} becomes free.`;
    default:
      return 'Automatically applied when your cart qualifies.';
  }
}

function getEligibleUnits(
  cartLines: MenuOfferCartLine[],
  itemMap: MenuOfferItemMap | null,
) {
  const eligibleIds = flattenOfferItemMap(itemMap);
  if (!eligibleIds.size) {
    return [] as OfferUnit[];
  }

  return cartLines.flatMap((line) => {
    if (!eligibleIds.has(line.itemId) || line.quantity <= 0) {
      return [] as OfferUnit[];
    }

    return Array.from({ length: line.quantity }, () => ({
      itemId: line.itemId,
      name: line.name,
      price: roundCurrency(line.unitPrice),
    }));
  });
}

function flattenOfferItemMap(itemMap: MenuOfferItemMap | null) {
  const itemIds = new Set<string>();

  for (const values of Object.values(itemMap || {})) {
    if (!Array.isArray(values)) {
      continue;
    }

    for (const itemId of values) {
      if (typeof itemId === 'string' && itemId.trim()) {
        itemIds.add(itemId.trim());
      }
    }
  }

  return itemIds;
}

function describeItemSet(
  itemMap: MenuOfferItemMap | null,
  itemNameById: Map<string, string> | Record<string, string> | undefined,
  fallback: string,
) {
  const itemIds = Array.from(flattenOfferItemMap(itemMap));
  if (!itemIds.length) {
    return fallback;
  }

  const labels = itemIds
    .map((itemId) => getItemName(itemId, itemNameById))
    .filter((value): value is string => Boolean(value));

  if (!labels.length) {
    return fallback;
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels[0]}, ${labels[1]}, and ${labels.length - 2} more`;
}

function getItemName(
  itemId: string,
  itemNameById?: Map<string, string> | Record<string, string>,
) {
  if (!itemNameById) {
    return null;
  }

  if (itemNameById instanceof Map) {
    return itemNameById.get(itemId) ?? null;
  }

  return typeof itemNameById[itemId] === 'string' ? itemNameById[itemId] : null;
}

function uniqueItemIds(units: OfferUnit[]) {
  return Array.from(new Set(units.map((unit) => unit.itemId)));
}

function clampPercentage(value: number | null) {
  return Math.max(0, Math.min(currency(value), 100));
}

function clampDiscount(discountAmount: number, subtotal: number) {
  return Math.min(roundCurrency(discountAmount), roundCurrency(subtotal));
}

function currency(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value)
    ? roundCurrency(value)
    : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function stripTrailingZeros(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value
        .toFixed(2)
        .replace(/\.0+$/, '')
        .replace(/(\.\d*[1-9])0+$/, '$1');
}

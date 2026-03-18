'use client';

import { useState } from 'react';
import { AnnouncementStrip } from '@/features/restaurant-menu/components/announcement-strip';
import { CategoryTabs } from '@/features/restaurant-menu/components/category-tabs';
import { FulfillmentSelector } from '@/features/restaurant-menu/components/fulfillment-selector';
import { ItemDetailsModal } from '@/features/restaurant-menu/components/item-details-modal';
import { LocationModal } from '@/features/restaurant-menu/components/location-modal';
import { MenuHeader } from '@/features/restaurant-menu/components/menu-header';
import { MenuSearch } from '@/features/restaurant-menu/components/menu-search';
import { MenuSection } from '@/features/restaurant-menu/components/menu-section';
import { PopularItemsCarousel } from '@/features/restaurant-menu/components/popular-items-carousel';
import { RestaurantInfoCard } from '@/features/restaurant-menu/components/restaurant-info-card';
import { RewardsBanner } from '@/features/restaurant-menu/components/rewards-banner';
import { ScheduleOrderModal } from '@/features/restaurant-menu/components/schedule-order-modal';
import { CartProvider } from '@/features/restaurant-menu/context/cart-context';
import { useActiveCategory } from '@/features/restaurant-menu/hooks/use-active-category';
import { useMenuCart } from '@/features/restaurant-menu/hooks/use-menu-cart';
import { useMenuSearch } from '@/features/restaurant-menu/hooks/use-menu-search';
import {
  findMenuItemById,
  getPopularItems,
  getScheduleSummary,
} from '@/features/restaurant-menu/lib/menu-selectors';
import type {
  FulfillmentMode,
  RestaurantMenuData,
  ScheduleSelection,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface MenuPageProps {
  data: RestaurantMenuData;
}

function MenuPageContent({ data }: MenuPageProps) {
  const { itemCount, addItem } = useMenuCart();
  const { query, setQuery, filteredCategories } = useMenuSearch(data.categories);
  const { activeCategoryId, registerSectionRef, scrollToCategory } = useActiveCategory(
    filteredCategories.map((category) => category.id),
  );
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>('pickup');
  const [selectedLocationId, setSelectedLocationId] = useState(data.locations[0]?.id || '');
  const [deliveryAddress, setDeliveryAddress] = useState(data.defaultDeliveryAddress);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSelection>({
    dayId: data.scheduleDays[0]?.id || '',
    time: data.scheduleDays[0]?.slots[1] || data.scheduleDays[0]?.slots[0] || '',
  });
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationModalMode, setLocationModalMode] = useState<FulfillmentMode>('pickup');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalSource, setScheduleModalSource] = useState<'info' | 'location'>('info');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedLocation =
    data.locations.find((location) => location.id === selectedLocationId) || data.locations[0];
  const scheduleLabel = getScheduleSummary(data.scheduleDays, selectedSchedule);
  const popularItems = getPopularItems(data);
  const selectedItem = selectedItemId
    ? findMenuItemById(data.categories, selectedItemId)
    : null;
  const locationLabel =
    fulfillmentMode === 'pickup'
      ? selectedLocation?.label || 'Select pickup location'
      : deliveryAddress.trim()
        ? `Deliver to ${deliveryAddress.trim()}`
        : 'Add delivery address';

  const openLocationModal = (mode: FulfillmentMode = fulfillmentMode) => {
    setLocationModalMode(mode);
    setLocationModalOpen(true);
  };

  const handleModeSelect = (mode: FulfillmentMode) => {
    if (mode === 'delivery' && !deliveryAddress.trim()) {
      openLocationModal('delivery');
      return;
    }

    setFulfillmentMode(mode);
  };

  const handleQuickAdd = (item: NonNullable<typeof selectedItem>) => {
    if (item.addOns?.length) {
      setSelectedItemId(item.id);
      return;
    }

    addItem({
      item,
      quantity: 1,
    });
  };

  return (
    <div id="top" className="min-h-screen bg-[#f6f2eb] text-slate-900">
      <div className="sticky top-0 z-40">
        <MenuHeader
          brand={data.brand}
          navigation={data.navigation}
          cartCount={itemCount}
        />
        <AnnouncementStrip text={data.announcement} />
      </div>

      <main className="mx-auto max-w-[1320px] space-y-8 px-4 py-8 sm:px-6 lg:space-y-10 lg:px-8 lg:py-10">
        <RestaurantInfoCard
          restaurant={data.restaurant}
          scheduleLabel={scheduleLabel}
          onChangeTime={() => {
            setScheduleModalSource('info');
            setScheduleModalOpen(true);
          }}
        />

        <FulfillmentSelector
          mode={fulfillmentMode}
          locationLabel={locationLabel}
          onModeSelect={handleModeSelect}
          onOpenLocation={() => openLocationModal(fulfillmentMode)}
        />

        <RewardsBanner rewards={data.rewards} />

        <PopularItemsCarousel
          items={popularItems}
          onOpenItem={(itemId) => setSelectedItemId(itemId)}
          onQuickAdd={handleQuickAdd}
        />

        <div className="sticky top-[112px] z-30 space-y-4 rounded-[30px] bg-[#f6f2eb] pt-1">
          <MenuSearch value={query} onChange={setQuery} />
          <CategoryTabs
            categories={filteredCategories.map((category) => ({
              id: category.id,
              label: category.label,
            }))}
            activeCategoryId={activeCategoryId}
            onSelect={scrollToCategory}
          />
        </div>

        <section id="menu-sections" className="space-y-8 lg:space-y-10">
          {filteredCategories.length ? (
            filteredCategories.map((category, index) => (
              <MenuSection
                key={category.id}
                category={category}
                onOpenItem={(itemId) => setSelectedItemId(itemId)}
                onQuickAdd={handleQuickAdd}
                registerRef={registerSectionRef(category.id)}
                first={index === 0}
              />
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-16 text-center shadow-sm">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                No dishes matched your search
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Try a broader term like chicken, naan, biryani, or masala.
              </p>
            </div>
          )}
        </section>
      </main>

      <ItemDetailsModal
        item={selectedItem}
        open={Boolean(selectedItem)}
        trustBanner={data.restaurant.trustBanner}
        onClose={() => setSelectedItemId(null)}
        onAddToCart={(input) => addItem(input)}
      />

      <LocationModal
        open={locationModalOpen}
        restaurantName={data.restaurant.name.replace(' Menu', '')}
        locations={data.locations}
        activeMode={locationModalMode}
        selectedLocationId={selectedLocationId}
        deliveryAddress={deliveryAddress}
        selectedScheduleLabel={scheduleLabel}
        onClose={() => setLocationModalOpen(false)}
        onModeChange={setLocationModalMode}
        onLocationChange={setSelectedLocationId}
        onDeliveryAddressChange={setDeliveryAddress}
        onScheduleClick={() => {
          setLocationModalOpen(false);
          setScheduleModalSource('location');
          setScheduleModalOpen(true);
        }}
        onConfirm={() => {
          setFulfillmentMode(locationModalMode);
          setLocationModalOpen(false);
        }}
      />

      <ScheduleOrderModal
        open={scheduleModalOpen}
        days={data.scheduleDays}
        currentSelection={selectedSchedule}
        onClose={() => setScheduleModalOpen(false)}
        onBack={() => {
          if (scheduleModalSource === 'location') {
            setScheduleModalOpen(false);
            setLocationModalOpen(true);
            return;
          }

          setScheduleModalOpen(false);
        }}
        onConfirm={(selection) => {
          setSelectedSchedule(selection);
          setScheduleModalOpen(false);
          if (scheduleModalSource === 'location') {
            setLocationModalOpen(true);
          }
        }}
      />
    </div>
  );
}

export default function MenuPage({ data }: MenuPageProps) {
  return (
    <CartProvider>
      <MenuPageContent data={data} />
    </CartProvider>
  );
}

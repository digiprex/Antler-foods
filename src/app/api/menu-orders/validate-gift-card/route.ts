import { NextRequest, NextResponse } from 'next/server';
import { validateMenuGiftCardCode } from '@/features/restaurant-menu/lib/server/menu-gift-cards';

interface ValidateGiftCardRequestBody {
  restaurantId?: string;
  email?: string;
  giftCardCode?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as ValidateGiftCardRequestBody | null;
    const restaurantId = body?.restaurantId || '';
    const email = body?.email || '';
    const giftCardCode = body?.giftCardCode ?? null;
    const giftCard = await validateMenuGiftCardCode({
      restaurantId,
      email,
      code: giftCardCode,
    });

    return NextResponse.json({
      success: true,
      giftCard,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    console.error('[Menu Orders] Validate gift card error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to validate this gift card right now.' },
      { status: 500 },
    );
  }
}

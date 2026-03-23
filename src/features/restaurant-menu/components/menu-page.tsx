'use client';

import { useState } from 'react';
import { AnnouncementStrip } from '@/features/restaurant-menu/components/announcement-strip';
import { SidebarNavigation } from '@/features/restaurant-menu/components/sidebar-navigation';
import { FulfillmentSelector } from '@/features/restaurant-menu/components/fulfillment-selector';
import { ItemDetailsModal } from '@/features/restaurant-menu/components/item-details-modal';
import { LocationModal } from '@/features/restaurant-menu/components/location-modal';
import { MenuSection } from '@/features/restaurant-menu/components/menu-section';
import { PopularItemsCarousel } from '@/features/restaurant-menu/components/popular-items-carousel';
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
  const contentContainerClass = 'mx-auto w-full max-w-[1120px] px-4 sm:px-6';

  const selectedLocation =
    data.locations.find((location) => location.id === selectedLocationId) || data.locations[0];
  const scheduleLabel = getScheduleSummary(data.scheduleDays, selectedSchedule);
  const popularItems = getPopularItems(data);
  const selectedItem = selectedItemId
    ? findMenuItemById(data.categories, selectedItemId)
    : null;
  const locationLabel =
    fulfillmentMode === 'pickup'
      ? `${selectedLocation?.label || 'Select pickup location'} • ${scheduleLabel}`
      : deliveryAddress.trim()
        ? `Deliver to ${deliveryAddress.trim()}`
        : 'Add delivery address';

  const openLocationModal = (mode: FulfillmentMode = fulfillmentMode) => {
    setLocationModalMode(mode);
    setLocationModalOpen(true);
  };

  const handleModeSelect = (mode: FulfillmentMode) => {
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
    <div
      className="min-h-screen bg-stone-100"
      style={{ paddingTop: 'var(--navbar-height, 0px)' }}
    >
      <div className="sticky top-0 z-50 border-b border-stone-200/70">
        <AnnouncementStrip text={data.announcement} />
      </div>

      <div className="mx-auto flex w-full max-w-[1440px]">
        <div className="hidden lg:block">
          <SidebarNavigation
            categories={filteredCategories.map((category) => ({
              id: category.id,
              label: category.label,
            }))}
            activeCategoryId={activeCategoryId}
            onSelect={scrollToCategory}
            searchQuery={query}
            onSearchQueryChange={setQuery}
          />
        </div>

        <div className="min-w-0 flex-1 bg-stone-50">
          <div className="border-b border-stone-200 bg-white/85 py-4 backdrop-blur sm:py-6">
            <div className={contentContainerClass}>
              <div className="mb-4 sm:mb-6">
              <h1 className="mb-2 text-xl font-bold text-stone-900 sm:text-2xl">
                {data.restaurant.name.replace(' Menu', '')}
              </h1>
                <div className="mb-4 flex flex-col gap-2 text-sm text-stone-600 sm:flex-row sm:items-center sm:gap-4">
                  <span>Location: {selectedLocation?.fullAddress || selectedLocation?.label || 'Location not set'}</span>
                  <span>Time: {scheduleLabel}</span>
                </div>
              </div>

              <FulfillmentSelector
                mode={fulfillmentMode}
                locationLabel={locationLabel}
                deliveryAddress={deliveryAddress}
                onModeSelect={handleModeSelect}
                onOpenSchedule={() => {
                  setScheduleModalSource('info');
                  setScheduleModalOpen(true);
                }}
                onDeliveryAddressChange={setDeliveryAddress}
              />
            </div>
          </div>

          <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden sm:px-6 sm:py-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filteredCategories.map((category) => {
                const isActive = category.id === activeCategoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToCategory(category.id)}
                    className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${contentContainerClass} space-y-6 py-4 sm:py-6`}>
            <RewardsBanner rewards={data.rewards} />

            <PopularItemsCarousel
              items={popularItems}
              onOpenItem={(itemId) => setSelectedItemId(itemId)}
              onQuickAdd={handleQuickAdd}
            />

            <section id="menu-sections" className="space-y-8 pb-8">
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
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center shadow-sm">
                  <h2 className="text-xl font-semibold text-stone-900">
                    No dishes matched your search
                  </h2>
                  <p className="mt-2 text-stone-600">
                    Try a broader term like chicken, naan, biryani, or masala.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

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

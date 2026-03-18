import type { Metadata } from 'next';
import { aromaBarAndGrillMenuMock } from '@/features/restaurant-menu/data/aroma-bar-and-grill.mock';
import { RestaurantMenuPage } from '@/features/restaurant-menu';

export const metadata: Metadata = {
  title: `${aromaBarAndGrillMenuMock.restaurant.name} | Online Ordering`,
  description: `Order pickup or delivery from ${aromaBarAndGrillMenuMock.restaurant.name}. Mock ordering flow ready for API and database integration.`,
};

export default function MenuPageRoute() {
  return <RestaurantMenuPage data={aromaBarAndGrillMenuMock} />;
}

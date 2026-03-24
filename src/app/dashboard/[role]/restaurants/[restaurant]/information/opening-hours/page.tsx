import dynamic from 'next/dynamic';
import { InformationOpeningHoursSkeleton } from '@/components/dashboard/my-info/information-skeleton';

const MyInfoOpeningHoursPage = dynamic(
  () => import('@/components/dashboard/my-info/my-info-pages').then((mod) => ({ default: mod.MyInfoOpeningHoursPage })),
  {
    loading: () => <InformationOpeningHoursSkeleton />,
    ssr: false
  }
);

export default function DashboardRestaurantInformationOpeningHoursPage() {
  return <MyInfoOpeningHoursPage />;
}

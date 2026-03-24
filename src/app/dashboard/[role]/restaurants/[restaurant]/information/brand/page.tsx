import dynamic from 'next/dynamic';
import { InformationSkeleton } from '@/components/dashboard/my-info/information-skeleton';

const MyInfoBrandPage = dynamic(
  () => import('@/components/dashboard/my-info/my-info-pages').then((mod) => ({ default: mod.MyInfoBrandPage })),
  {
    loading: () => <InformationSkeleton />,
    ssr: false
  }
);

export default function DashboardRestaurantInformationBrandPage() {
  return <MyInfoBrandPage />;
}

import dynamic from 'next/dynamic';
import { InformationAddressSkeleton } from '@/components/dashboard/my-info/information-skeleton';

const MyInfoAddressPage = dynamic(
  () => import('@/components/dashboard/my-info/my-info-pages').then((mod) => ({ default: mod.MyInfoAddressPage })),
  {
    loading: () => <InformationAddressSkeleton />,
    ssr: false
  }
);

export default function DashboardRestaurantInformationAddressPage() {
  return <MyInfoAddressPage />;
}

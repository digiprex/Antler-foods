import dynamic from 'next/dynamic';
import { InformationGoogleProfileSkeleton } from '@/components/dashboard/my-info/information-skeleton';

const MyInfoGoogleProfilePage = dynamic(
  () => import('@/components/dashboard/my-info/my-info-pages').then((mod) => ({ default: mod.MyInfoGoogleProfilePage })),
  {
    loading: () => <InformationGoogleProfileSkeleton />,
    ssr: false
  }
);

export default function DashboardRestaurantInformationGoogleProfilePage() {
  return <MyInfoGoogleProfilePage />;
}

import { PurpleDotSpinner } from '@/components/dashboard/purple-dot-spinner';

export default function DashboardRestaurantMediaLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <PurpleDotSpinner size="md" label="Loading media page" />
    </div>
  );
}

import { PurpleDotSpinner } from '@/components/dashboard/purple-dot-spinner';

export default function DashboardRoleLoading() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <PurpleDotSpinner size="md" label="Loading dashboard page" />
    </div>
  );
}

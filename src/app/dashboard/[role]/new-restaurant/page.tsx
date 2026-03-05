import { NewRestaurantWizard } from "@/components/restaurants/new-restaurant/new-restaurant-wizard";

export default function DashboardNewRestaurantPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Add New Restaurant</h1>
          <p className="text-sm text-gray-600">Set up a new restaurant location in your system</p>
        </div>
      </div>
      <NewRestaurantWizard />
    </section>
  );
}

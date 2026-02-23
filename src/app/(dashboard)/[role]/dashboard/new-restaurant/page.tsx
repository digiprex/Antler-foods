import { NewRestaurantWizard } from "@/components/restaurants/new-restaurant/new-restaurant-wizard";

export default function DashboardNewRestaurantPage() {
  return (
    <section className="space-y-5">
      <h1 className="text-[40px] font-semibold tracking-tight text-[#101827]">New restaurant</h1>
      <NewRestaurantWizard />
    </section>
  );
}

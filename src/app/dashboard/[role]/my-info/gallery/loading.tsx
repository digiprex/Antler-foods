function PurpleDotSpinner() {
  return (
    <span
      className="inline-grid h-9 w-9 grid-cols-2 grid-rows-2 gap-1.5"
      role="status"
      aria-label="Loading media page"
    >
      <span className="h-3 w-3 animate-[pulse_0.9s_ease-in-out_infinite] rounded-full bg-[#6f4cf6]" />
      <span className="h-3 w-3 animate-[pulse_0.9s_ease-in-out_0.2s_infinite] rounded-full bg-[#8f6cff]" />
      <span className="h-3 w-3 animate-[pulse_0.9s_ease-in-out_0.3s_infinite] rounded-full bg-[#9f84ff]" />
      <span className="h-3 w-3 animate-[pulse_0.9s_ease-in-out_0.45s_infinite] rounded-full bg-[#b19dff]" />
    </span>
  );
}

export default function DashboardRoleMyInfoGalleryLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <PurpleDotSpinner />
    </div>
  );
}

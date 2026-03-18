interface AnnouncementStripProps {
  text: string;
}

export function AnnouncementStrip({ text }: AnnouncementStripProps) {
  return (
    <div className="bg-black px-4 py-3 text-center text-sm font-semibold text-white">
      {text}
    </div>
  );
}

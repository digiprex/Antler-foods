'use client';

import { LayoutCard } from '@/components/admin/section-settings-primitives';
import type { CustomSectionLayoutDefinition } from '@/lib/custom-section/layouts';
import type { CustomSectionLayout } from '@/types/custom-section.types';
import { CustomSectionLayoutThumbnail } from './layout-thumbnail';

export function CustomSectionLayoutPicker({
  layouts,
  selectedLayout,
  onSelect,
}: {
  layouts: CustomSectionLayoutDefinition[];
  selectedLayout: CustomSectionLayout;
  onSelect: (layout: CustomSectionLayout) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {layouts.map((layout) => {
        const selected = layout.value === selectedLayout;
        return (
          <LayoutCard
            key={layout.value}
            title={layout.name}
            description={layout.description}
            badge={selected ? `Selected · ${layout.badge}` : layout.badge}
            selected={selected}
            onClick={() => onSelect(layout.value)}
            preview={<CustomSectionLayoutThumbnail definition={layout} active={selected} />}
          />
        );
      })}
    </div>
  );
}

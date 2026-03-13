'use client';

import CustomSection from '@/components/custom-section';
import { PreviewModal } from '@/components/admin/section-settings-primitives';
import type { EditorViewport } from '@/components/admin/section-settings-primitives';
import { getCustomSectionLayoutDefinition } from '@/lib/custom-section/layouts';
import type { CustomSectionConfig } from '@/types/custom-section.types';

export function CustomSectionPreviewModal({
  config,
  viewport,
  onViewportChange,
  onClose,
  restaurantId,
}: {
  config: CustomSectionConfig;
  viewport: EditorViewport;
  onViewportChange: (viewport: EditorViewport) => void;
  onClose: () => void;
  restaurantId?: string;
}) {
  const layout = getCustomSectionLayoutDefinition(config.layout);

  return (
    <PreviewModal
      title="Live Preview"
      description={`Switch between desktop and mobile to verify the ${layout.name} composition.`}
      viewport={viewport}
      onViewportChange={onViewportChange}
      onClose={onClose}
      note="Live preview reflects your current custom section content, media, and styling changes."
    >
      <CustomSection
        {...config}
        restaurant_id={restaurantId}
        previewMode={viewport}
      />
    </PreviewModal>
  );
}

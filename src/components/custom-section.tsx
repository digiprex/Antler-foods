'use client';

import type { CustomSectionConfig, CustomSectionViewport } from '@/types/custom-section.types';
import { CustomSectionRenderer } from './custom-section-renderer';

interface CustomSectionProps extends Partial<CustomSectionConfig> {
  restaurant_id?: string;
  previewMode?: CustomSectionViewport;
}

export default function CustomSection(props: CustomSectionProps) {
  return <CustomSectionRenderer {...props} />;
}

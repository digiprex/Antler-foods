import type { SectionStyleConfig } from '@/types/section-style.types';
import { SECTION_STYLE_KEYS } from '@/types/section-style.types';

export function extractSectionStyleConfig(
  source: Record<string, unknown>,
): Partial<SectionStyleConfig> {
  const config: Partial<SectionStyleConfig> = {};

  for (const key of SECTION_STYLE_KEYS) {
    if (source[key] !== undefined) {
      config[key] = source[key] as never;
    }
  }

  return config;
}

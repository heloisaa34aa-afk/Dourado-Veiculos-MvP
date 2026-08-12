import { describe, expect, it } from 'vitest';
import { BANNER_FORMAT_SPECS, bannerSizeLabel } from './bannerFormats';

describe('banner format specifications', () => {
  it('uses a horizontal desktop and vertical mobile artwork for popups', () => {
    const popup = BANNER_FORMAT_SPECS.popup;
    expect(popup.desktop.width / popup.desktop.height).toBeGreaterThan(3);
    expect(popup.mobile.width / popup.mobile.height).toBeLessThan(1);
  });

  it('uses a thinner ratio for the top bar than for the home banner', () => {
    const topRatio = BANNER_FORMAT_SPECS.top_bar.desktop.width / BANNER_FORMAT_SPECS.top_bar.desktop.height;
    const homeRatio = BANNER_FORMAT_SPECS.home_inline.desktop.width / BANNER_FORMAT_SPECS.home_inline.desktop.height;
    expect(topRatio).toBeGreaterThan(homeRatio);
  });

  it('formats upload dimensions for the interface', () => {
    expect(bannerSizeLabel(BANNER_FORMAT_SPECS.popup.mobile)).toBe('1080 × 1350 px');
  });
});

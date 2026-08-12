import type { BannerPlacement } from '../services/banner.service';

export interface BannerImageSize {
  width: number;
  height: number;
  description: string;
}

export interface BannerFormatSpec {
  label: string;
  desktop: BannerImageSize;
  mobile: BannerImageSize;
}

export const BANNER_FORMAT_SPECS: Record<BannerPlacement, BannerFormatSpec> = {
  popup: {
    label: 'Popup promocional',
    desktop: { width: 1600, height: 500, description: 'arte horizontal para computador' },
    mobile: { width: 1080, height: 1350, description: 'arte vertical para celular' },
  },
  home_inline: {
    label: 'Banner horizontal na página inicial',
    desktop: { width: 1600, height: 500, description: 'banner largo para computador' },
    mobile: { width: 1080, height: 700, description: 'banner horizontal adaptado ao celular' },
  },
  top_bar: {
    label: 'Faixa superior',
    desktop: { width: 1600, height: 120, description: 'faixa fina para computador' },
    mobile: { width: 1080, height: 220, description: 'faixa compacta para celular' },
  },
};

export function bannerSizeLabel(size: BannerImageSize) {
  return `${size.width} × ${size.height} px`;
}

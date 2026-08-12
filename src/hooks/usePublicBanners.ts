import { useEffect, useState } from 'react';
import { bannerService, SiteBanner } from '../services/banner.service';

export function usePublicBanners() {
  const [banners, setBanners] = useState<SiteBanner[]>([]);

  useEffect(() => {
    let active = true;
    bannerService.listPublic()
      .then(data => { if (active) setBanners(data); })
      .catch(error => console.warn('[banners] Não foi possível carregar:', error));
    return () => { active = false; };
  }, []);

  return banners;
}

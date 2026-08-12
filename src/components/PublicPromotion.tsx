import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { BannerPlacement, SiteBanner } from '../services/banner.service';

interface PublicPromotionProps {
  banners: SiteBanner[];
  placement: BannerPlacement;
}

function BannerPicture({ banner, className }: { banner: SiteBanner; className: string }) {
  const desktop = banner.desktop_image_url || banner.mobile_image_url;
  if (!desktop) return null;
  return (
    <picture>
      {banner.mobile_image_url && <source media="(max-width: 640px)" srcSet={banner.mobile_image_url} />}
      <img src={desktop} alt={banner.title || banner.name} className={className} />
    </picture>
  );
}

function PromotionContent({ banner, compact = false }: { banner: SiteBanner; compact?: boolean }) {
  return (
    <div className={`relative z-10 flex items-center ${compact ? 'justify-center gap-3 px-10 py-2 text-center' : 'h-full flex-col justify-center gap-3 p-6 text-center sm:items-start sm:text-left'}`}>
      <div>
        {banner.title && <h2 className={compact ? 'text-sm font-extrabold' : 'text-2xl font-black sm:text-4xl'}>{banner.title}</h2>}
        {banner.subtitle && <p className={`${compact ? 'hidden sm:inline sm:pl-2 text-xs opacity-80' : 'mt-2 max-w-xl text-sm opacity-80 sm:text-base'}`}>{banner.subtitle}</p>}
      </div>
      {banner.cta_label && banner.cta_url && (
        <a href={banner.cta_url} className={`${compact ? 'rounded-full bg-white/15 px-3 py-1 text-xs' : 'mt-2 rounded-xl bg-white px-5 py-3 text-sm text-slate-950 shadow-lg'} inline-flex items-center gap-2 font-extrabold transition hover:scale-[1.02]`}>
          {banner.cta_label}<ArrowRight className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

export function PublicPromotion({ banners, placement }: PublicPromotionProps) {
  const banner = banners.find(item => item.placement === placement);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(Boolean(banner?.show_once_per_session && sessionStorage.getItem(`banner:${banner.id}`)));
  }, [banner]);

  if (!banner || dismissed) return null;

  const dismiss = () => {
    if (banner.show_once_per_session) sessionStorage.setItem(`banner:${banner.id}`, 'dismissed');
    setDismissed(true);
  };

  if (placement === 'top_bar') {
    return (
      <aside style={{ backgroundColor: banner.background_color, color: banner.text_color }} className="relative min-h-10 overflow-hidden">
        <BannerPicture banner={banner} className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <PromotionContent banner={banner} compact />
        {banner.is_dismissible && <button onClick={dismiss} aria-label="Fechar promoção" className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-1 hover:bg-white/15"><X className="h-4 w-4" /></button>}
      </aside>
    );
  }

  if (placement === 'home_inline') {
    return (
      <aside style={{ backgroundColor: banner.background_color, color: banner.text_color }} className="relative mx-auto min-h-52 max-w-7xl overflow-hidden rounded-3xl shadow-xl sm:min-h-64">
        <BannerPicture banner={banner} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        <PromotionContent banner={banner} />
        {banner.is_dismissible && <button onClick={dismiss} aria-label="Fechar promoção" className="absolute right-3 top-3 z-20 rounded-full bg-black/45 p-2 text-white backdrop-blur hover:bg-black/65"><X className="h-5 w-5" /></button>}
      </aside>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={banner.name} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-5">
      <aside
        style={{ backgroundColor: banner.background_color, color: banner.text_color }}
        className="relative max-h-[94dvh] max-w-[96vw] overflow-hidden rounded-2xl shadow-2xl sm:rounded-3xl"
      >
        {banner.desktop_image_url || banner.mobile_image_url ? (
          banner.cta_url ? (
            <a href={banner.cta_url} aria-label={banner.cta_label || banner.title || banner.name} className="block">
              <BannerPicture banner={banner} className="block max-h-[94dvh] w-[96vw] max-w-[96vw] object-contain sm:h-auto sm:w-auto" />
            </a>
          ) : (
            <BannerPicture banner={banner} className="block max-h-[94dvh] w-[96vw] max-w-[96vw] object-contain sm:h-auto sm:w-auto" />
          )
        ) : (
          <div className="min-h-80 w-[min(92vw,560px)]">
            <PromotionContent banner={banner} />
          </div>
        )}
        {banner.is_dismissible && <button onClick={dismiss} aria-label="Fechar promoção" className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-2 text-white backdrop-blur hover:bg-black/80"><X className="h-5 w-5" /></button>}
        {banner.show_once_per_session && banner.is_dismissible && (
          <button onClick={dismiss} className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-4 py-2 text-[11px] font-semibold text-white underline backdrop-blur hover:bg-black/80">
            Não mostrar novamente nesta visita
          </button>
        )}
      </aside>
    </div>
  );
}

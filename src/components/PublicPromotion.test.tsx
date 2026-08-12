import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicPromotion } from './PublicPromotion';
import type { SiteBanner } from '../services/banner.service';

const banner: SiteBanner = {
  id: 'promo-1', name: 'Feirão', placement: 'popup', title: 'Troque de carro', subtitle: 'Oferta especial',
  desktop_image_url: 'desktop.jpg', desktop_storage_path: 'desktop.jpg', mobile_image_url: 'mobile.jpg', mobile_storage_path: 'mobile.jpg',
  cta_label: 'Falar agora', cta_url: 'https://example.com', background_color: '#000000', text_color: '#ffffff',
  is_active: true, is_dismissible: true, show_once_per_session: true, starts_at: null, ends_at: null,
  priority: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

describe('PublicPromotion', () => {
  afterEach(() => { cleanup(); sessionStorage.clear(); });

  it('renders and remembers dismissal during the session', () => {
    const { rerender } = render(<PublicPromotion banners={[banner]} placement="popup" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar promoção' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<PublicPromotion banners={[]} placement="popup" />);
    rerender(<PublicPromotion banners={[banner]} placement="popup" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

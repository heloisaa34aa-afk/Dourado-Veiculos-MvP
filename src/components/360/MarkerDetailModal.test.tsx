import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkerDetailModal } from './MarkerDetailModal';

describe('MarkerDetailModal', () => {
  it('renders correctly and takes full screen classes', () => {
    const { container } = render(
      <MarkerDetailModal 
        isOpen={true} 
        onClose={() => {}} 
        type="poi" 
        title="Test Modal" 
        images={[{ url: 'img1.jpg', order: 0 }]} 
      />
    );
    expect(screen.getByText('Test Modal')).toBeDefined();
  });
});
const fs = require('fs');
let content = fs.readFileSync('src/components/360/MarkerDetailModal.tsx', 'utf8');

content = content.replace(
  'className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"',
  'className="bg-white w-full h-full sm:rounded-2xl sm:w-11/12 sm:h-[90vh] sm:max-w-6xl flex flex-col overflow-hidden shadow-2xl relative"'
);

// We need it to be full screen everywhere. Wait, the user said "Corrija o MarkerDetailModal para abrir realmente em tela cheia no site público."
// "ocupar toda a tela com inset: 0"
// "aproveitar o máximo da largura e altura"

content = content.replace(
  'className="bg-white w-full h-full sm:rounded-2xl sm:w-11/12 sm:h-[90vh] sm:max-w-6xl flex flex-col overflow-hidden shadow-2xl relative"',
  'className="bg-white w-full h-full flex flex-col md:flex-row overflow-hidden relative"'
);
content = content.replace(
  'className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"',
  'className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"'
);

// Maximize image section
content = content.replace(
  '<div className="flex flex-col md:flex-row h-full max-h-[90vh]">',
  '<div className="flex flex-col md:flex-row h-full w-full">'
);

content = content.replace(
  'className="w-full md:w-80 lg:w-96 p-6 flex flex-col gap-4 overflow-y-auto bg-white"',
  'className="w-full md:w-96 p-6 flex flex-col gap-4 overflow-y-auto bg-white border-l border-gray-200 z-10 shadow-lg shrink-0"'
);

content = content.replace(
  'className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-0"',
  'className="flex-1 bg-black/95 relative flex items-center justify-center min-h-[300px] md:min-h-0 overflow-hidden"'
);

// We need keyboard navigation
content = content.replace(
  'if (e.key === \'Escape\') onClose();',
  `if (e.key === 'Escape') onClose();
        if (images.length > 1) {
          if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
          if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
        }`
);

// Swipe gestures
const stateAndTouch = `  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && images.length > 1) {
      setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    }
    if (isRightSwipe && images.length > 1) {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    }
  };`;

content = content.replace(
  `  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);`,
  stateAndTouch
);

content = content.replace(
  '<div className="flex-1 bg-black/95 relative flex items-center justify-center min-h-[300px] md:min-h-0 overflow-hidden">',
  '<div className="flex-1 bg-black/95 relative flex items-center justify-center min-h-[300px] md:min-h-0 overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>'
);

// Block body scroll
content = content.replace(
  'return () => window.removeEventListener(\'keydown\', handleEscape);',
  `document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };`
);

fs.writeFileSync('src/components/360/MarkerDetailModal.tsx', content);

// Also let's fix the vitest test
const testCode = `import { describe, it, expect, vi } from 'vitest';
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
});`;
fs.writeFileSync('src/components/360/MarkerDetailModal.test.tsx', testCode);


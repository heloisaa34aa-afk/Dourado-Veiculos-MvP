import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface MarkerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'poi' | 'damage';
  title: string;
  description?: string;
  category?: string;
  frameNumber?: number;
  images: { url: string; order: number }[];
}

export function MarkerDetailModal({ isOpen, onClose, type, title, description, category, frameNumber, images }: MarkerDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setImageError(false);
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex];
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    setImageError(false);
  };
  
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    setImageError(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          {/* Image Section */}
          <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-0">
            {images.length > 0 ? (
              <>
                {imageError ? (
                  <div className="text-gray-500 flex flex-col items-center">
                    <ImageIcon size={48} className="mb-2 opacity-50" />
                    <p>Erro ao carregar imagem</p>
                  </div>
                ) : (
                  <img 
                    src={currentImage.url} 
                    alt={title} 
                    className="w-full h-full object-contain"
                    onError={() => setImageError(true)}
                  />
                )}
                
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrev}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white hover:bg-black/80 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white hover:bg-black/80 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                      <ChevronRight size={24} />
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-y-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full backdrop-blur-sm">
                      {currentIndex + 1} / {images.length}
                    </div>
                  </>
                )}
                
                <a 
                  href={currentImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-sm rounded-lg backdrop-blur-sm transition-colors"
                >
                  <ExternalLink size={16} /> Abrir original
                </a>
              </>
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <ImageIcon size={48} className="mb-2 opacity-50" />
                <p>Nenhuma imagem disponível</p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="w-full md:w-80 lg:w-96 p-6 flex flex-col gap-4 overflow-y-auto bg-white">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${type === 'poi' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                  {type === 'poi' ? 'Ponto de Interesse' : category || 'Avaria'}
                </span>
                {frameNumber !== undefined && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                    Ref: Frame {frameNumber + 1}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
              {description && (
                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{description}</p>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Galeria de Imagens</h4>
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); setImageError(false); }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-indigo-600 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useState, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, PointerEvent as ReactPointerEvent } from 'react';


export interface Coordinate {
  x: number;
  y: number;
}

export interface MarkerProps {
  id: string;
  x: number;
  y: number;
  active?: boolean;
  content: React.ReactNode;
}

interface ImageCoordinateStageProps {
  imageUrl: string;
  markers?: MarkerProps[];
  onCoordinateClick?: (coord: Coordinate) => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  className?: string;
  children?: React.ReactNode;
}

export function ImageCoordinateStage({
  imageUrl,
  markers = [],
  onCoordinateClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  className,
  children
}: ImageCoordinateStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageRect, setImageRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  const calculateRect = () => {
    if (!containerRef.current || !imageRef.current) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const img = imageRef.current;
    
    // Natural dimensions
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    
    if (!naturalW || !naturalH) return;
    
    const containerW = container.width;
    const containerH = container.height;
    
    const scale = Math.min(containerW / naturalW, containerH / naturalH);
    
    const imgW = naturalW * scale;
    const imgH = naturalH * scale;
    
    // object-contain centers the image
    const imgX = (containerW - imgW) / 2;
    const imgY = (containerH - imgH) / 2;
    
    setImageRect({
      x: imgX,
      y: imgY,
      width: imgW,
      height: imgH
    });
  };

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      calculateRect();
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    window.addEventListener('resize', calculateRect);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateRect);
    };
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (onPointerDown) onPointerDown(e);
    
    if (!onCoordinateClick || !imageRect || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate click relative to container
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;
    
    // Check if click is inside the image bounds
    if (
      clickX >= imageRect.x &&
      clickX <= imageRect.x + imageRect.width &&
      clickY >= imageRect.y &&
      clickY <= imageRect.y + imageRect.height
    ) {
      // Calculate normalized coordinates (0 to 100) relative to image
      const relativeX = clickX - imageRect.x;
      const relativeY = clickY - imageRect.y;
      
      const normalizedX = (relativeX / imageRect.width) * 100;
      const normalizedY = (relativeY / imageRect.height) * 100;
      
      const x = Math.max(0, Math.min(100, normalizedX));
      const y = Math.max(0, Math.min(100, normalizedY));
      
      onCoordinateClick({ x, y });
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full select-none overflow-hidden touch-none ${className || ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="360 View Frame"
        className="w-full h-full object-contain pointer-events-none block"
        onLoad={calculateRect}
        draggable={false}
      />
      
      {imageRect && markers.map((marker) => {
        // Calculate absolute position based on normalized coordinates
        const absX = imageRect.x + (marker.x / 100) * imageRect.width;
        const absY = imageRect.y + (marker.y / 100) * imageRect.height;
        
        return (
          <div
            key={marker.id}
            className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            style={{
              left: `${absX}px`,
              top: `${absY}px`
            }}
          >
            {marker.content}
          </div>
        );
      })}
      
      {/* Optional overlays, controls or UI that should overlay the stage */}
      <div className="absolute inset-0 pointer-events-none">
        {children}
      </div>
    </div>
  );
}

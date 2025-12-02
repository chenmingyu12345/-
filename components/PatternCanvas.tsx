
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { PatternResult, AppConfig } from '../types';

interface PatternCanvasProps {
  pattern: PatternResult | null;
  config: AppConfig;
  className?: string;
}

export interface PatternCanvasHandle {
  toDataURL: (type?: string, quality?: number) => string | undefined;
}

export const PatternCanvas = forwardRef<PatternCanvasHandle, PatternCanvasProps>(({ pattern, config, className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    toDataURL: (type, quality) => {
      return canvasRef.current?.toDataURL(type, quality);
    },
    toPixelImageURL: (type) => {
        if (!pattern) return undefined;
        // Create hidden canvas for pixel art only export
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pattern.width; // 1:1 pixel resolution
        tempCanvas.height = pattern.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return undefined;
        
        pattern.pixels.forEach((row, y) => {
            row.forEach((pixel, x) => {
                if (pixel.color.id !== 'H01') {
                    ctx.fillStyle = pixel.color.hex;
                    ctx.fillRect(x, y, 1, 1);
                }
            });
        });
        return tempCanvas.toDataURL(type || 'image/png');
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pattern) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Drawing Settings
    const cellSize = 22; 
    const width = pattern.width * cellSize;
    const height = pattern.height * cellSize;
    
    // Set actual canvas size (resolution)
    // We keep high resolution for download quality, but use CSS to scale it down for view
    canvas.width = width;
    canvas.height = height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background (white for canvas, but represents transparency for beads)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw Beads
    pattern.pixels.forEach((row, y) => {
      row.forEach((pixel, x) => {
        const px = x * cellSize;
        const py = y * cellSize;
        const cx = px + cellSize / 2;
        const cy = py + cellSize / 2;

        const isTransparent = pixel.color.id === 'H01';

        // Draw Bead Color Background
        if (!isTransparent) {
            ctx.fillStyle = pixel.color.hex;
            ctx.fillRect(px, py, cellSize, cellSize);
        }

        // Draw Grid if enabled (Draw lightly even on empty cells to show structure)
        if (config.showGrid) {
          ctx.strokeStyle = 'rgba(0,0,0,0.15)'; 
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }
        
        if (!isTransparent) {
            // Bead effect (Visual flair)
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            // Hole in middle
            ctx.fillStyle = pixel.color.hex; 
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.1, 0, Math.PI * 2);
            ctx.fill();

            // --- DRAW COLOR ID TEXT ---
            const { r, g, b } = pixel.color.rgb;
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            ctx.fillStyle = brightness > 140 ? '#000000' : '#FFFFFF';
            ctx.font = 'bold 8px sans-serif'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pixel.color.id, cx, cy);
        }
      });
    });

  }, [pattern, config]);

  if (!pattern) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 ${className}`} style={{ minHeight: '300px' }}>
        尚未生成图纸
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center overflow-hidden border border-gray-200 rounded-lg shadow-inner bg-white p-2 ${className}`}>
        {/* CSS Scaling: maxWidth/Height ensures it fits in the box without scrolling */}
        <canvas 
            ref={canvasRef} 
            className="block shadow-sm"
            style={{ 
                maxWidth: '100%', 
                maxHeight: '65vh', // Limit height to reasonable view height
                objectFit: 'contain',
                height: 'auto',
                width: 'auto'
            }} 
        />
    </div>
  );
});

PatternCanvas.displayName = 'PatternCanvas';

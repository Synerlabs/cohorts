'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps extends React.HTMLAttributes<HTMLDivElement> {
  onSignatureChange?: (dataUrl: string | null) => void;
  initialSignature?: string | null;
  className?: string;
}

export function SignaturePad({
  onSignatureChange,
  initialSignature = null,
  className,
  ...props
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [localSignature, setLocalSignature] = useState<string | null>(initialSignature);
  const lastPosition = useRef({ x: 0, y: 0 });

  // Initialize canvas and load initial signature if provided
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on container size
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        // Set the canvas to match the parent element size while maintaining proper pixel density
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = (rect.width * 0.4) * window.devicePixelRatio; // Height is 40% of width
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.width * 0.4}px`;

        // Scale the context to match the device pixel ratio
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Set styles for drawing
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
      }
    };

    // Initial setup
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Load signature when local signature changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    
    // Load signature if available
    if (localSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
        setHasSignature(true);
      };
      img.src = localSignature;
    } else {
      setHasSignature(false);
    }
  }, [localSignature]);

  // Update external state when local signature changes
  useEffect(() => {
    if (onSignatureChange) {
      onSignatureChange(localSignature);
    }
  }, [localSignature, onSignatureChange]);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    
    const { x, y } = getCoordinates(e);
    lastPosition.current = { x, y };
    
    // Start a new path
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Prevent scrolling on touch devices
    if (e.type.includes('touch')) {
      e.preventDefault();
    }
    
    const { x, y } = getCoordinates(e);
    
    // Only draw if the position has changed
    if (x !== lastPosition.current.x || y !== lastPosition.current.y) {
      ctx.beginPath();
      ctx.moveTo(lastPosition.current.x, lastPosition.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      
      lastPosition.current = { x, y };
      
      // Set hasSignature to true when there is actual drawing
      if (!hasSignature) {
        setHasSignature(true);
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      
      // Only update the signature data if something was actually drawn
      const canvas = canvasRef.current;
      if (canvas && hasSignature) {
        try {
          // Update local signature state
          const dataUrl = canvas.toDataURL('image/png');
          setLocalSignature(dataUrl);
        } catch (error) {
          console.error('Error converting signature to image:', error);
        }
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    setHasSignature(false);
    setLocalSignature(null);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      // Touch event
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <div className="border rounded-md relative bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: 'none' }}
        />
        <div className="absolute bottom-2 right-2 flex gap-2">
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            className="bg-white/80 backdrop-blur-sm h-8 w-8 p-0" 
            onClick={clearCanvas}
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">Sign above using your mouse or finger</p>
    </div>
  );
} 
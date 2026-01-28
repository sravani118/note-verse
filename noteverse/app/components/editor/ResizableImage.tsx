'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useRef } from 'react';

export default function ResizableImage({ node, updateAttributes, selected }: NodeViewProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Get the current dimensions, or use natural size if not set
  const currentWidth = node.attrs.width || (naturalSize.width ? `${Math.min(naturalSize.width, 800)}px` : 'auto');
  const currentHeight = node.attrs.height || (naturalSize.height ? `${Math.min(naturalSize.height, 800)}px` : 'auto');

  // Handle image load to get natural dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!node.attrs.width && !node.attrs.height) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      
      // Set initial dimensions if not already set
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      const maxWidth = 800;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      updateAttributes({
        width: `${width}px`,
        height: `${height}px`,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    const img = imageRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startPos.current.x;
      const deltaY = moveEvent.clientY - startPos.current.y;

      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;

      if (direction.includes('e')) {
        newWidth = Math.max(100, startPos.current.width + deltaX);
      }
      if (direction.includes('w')) {
        newWidth = Math.max(100, startPos.current.width - deltaX);
      }
      if (direction.includes('s')) {
        newHeight = Math.max(100, startPos.current.height + deltaY);
      }
      if (direction.includes('n')) {
        newHeight = Math.max(100, startPos.current.height - deltaY);
      }

      // Maintain aspect ratio if both dimensions change
      if (direction.length > 1) {
        const aspectRatio = startPos.current.width / startPos.current.height;
        if (direction.includes('e') || direction.includes('w')) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }

      // Update directly via updateAttributes
      updateAttributes({
        width: `${newWidth}px`,
        height: `${newHeight}px`,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <NodeViewWrapper className="relative inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        onLoad={handleImageLoad}
        style={{
          width: currentWidth,
          height: currentHeight,
          maxWidth: '100%',
          display: 'block',
        }}
        className={`rounded-lg transition-all ${
          selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
        } ${isResizing ? 'pointer-events-none' : ''}`}
      />
      
      {selected && (
        <>
          {/* Corner resize handles */}
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-indigo-500 rounded-full cursor-nw-resize"
            onMouseDown={(e) => handleMouseDown(e, 'nw')}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full cursor-ne-resize"
            onMouseDown={(e) => handleMouseDown(e, 'ne')}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-indigo-500 rounded-full cursor-sw-resize"
            onMouseDown={(e) => handleMouseDown(e, 'sw')}
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full cursor-se-resize"
            onMouseDown={(e) => handleMouseDown(e, 'se')}
          />
          
          {/* Edge resize handles */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-500 rounded-full cursor-n-resize"
            onMouseDown={(e) => handleMouseDown(e, 'n')}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-500 rounded-full cursor-s-resize"
            onMouseDown={(e) => handleMouseDown(e, 's')}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-indigo-500 rounded-full cursor-w-resize"
            onMouseDown={(e) => handleMouseDown(e, 'w')}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-indigo-500 rounded-full cursor-e-resize"
            onMouseDown={(e) => handleMouseDown(e, 'e')}
          />
        </>
      )}
    </NodeViewWrapper>
  );
}

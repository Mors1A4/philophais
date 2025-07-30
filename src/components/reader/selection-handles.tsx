
"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface SelectionHandlesProps {
  startRect: DOMRect | null;
  endRect: DOMRect | null;
  containerRef: React.RefObject<HTMLElement>;
  onDragStart: (handle: 'start' | 'end') => void;
  onDrag: (handle: 'start' | 'end', clientX: number, clientY: number) => void;
  onDragEnd: (handle: 'start' | 'end') => void;
}

export const SelectionHandles: React.FC<SelectionHandlesProps> = ({
  startRect,
  endRect,
  containerRef,
  onDragStart,
  onDrag,
  onDragEnd,
}) => {
  if (!startRect || !endRect || !containerRef.current) return null;

  const containerRect = containerRef.current.getBoundingClientRect();
  const scrollTop = containerRef.current.scrollTop;

  const getHandleStyle = (rect: DOMRect, handle: 'start' | 'end'): React.CSSProperties => {
    const top = rect.top - containerRect.top + scrollTop;
    const left = rect.left - containerRect.left;
    
    if (handle === 'start') {
      return {
        transform: `translate(${left - 4}px, ${top + rect.height}px)`,
      };
    } else {
      return {
        transform: `translate(${left + rect.width - 4}px, ${top + rect.height}px)`,
      };
    }
  };

  const handleTouchStart = (e: React.TouchEvent, handle: 'start' | 'end') => {
    onDragStart(handle);
  };

  const handleTouchMove = (e: React.TouchEvent, handle: 'start' | 'end') => {
    const touch = e.touches[0];
    onDrag(handle, touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent, handle: 'start' | 'end') => {
    onDragEnd(handle);
  };

  return (
    <>
      <div
        className={cn(
          "absolute w-2 h-8 bg-blue-500 rounded-sm cursor-col-resize z-20",
          "border border-white"
        )}
        style={getHandleStyle(startRect, 'start')}
        onTouchStart={(e) => handleTouchStart(e, 'start')}
        onTouchMove={(e) => handleTouchMove(e, 'start')}
        onTouchEnd={(e) => handleTouchEnd(e, 'start')}
      />
      <div
        className={cn(
          "absolute w-2 h-8 bg-blue-500 rounded-sm cursor-col-resize z-20",
           "border border-white"
        )}
        style={getHandleStyle(endRect, 'end')}
        onTouchStart={(e) => handleTouchStart(e, 'end')}
        onTouchMove={(e) => handleTouchMove(e, 'end')}
        onTouchEnd={(e) => handleTouchEnd(e, 'end')}
      />
    </>
  );
};

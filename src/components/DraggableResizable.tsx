"use client";

import { useRef, useEffect, useState } from "react";
import { Rnd } from "react-rnd";

interface DraggableResizableProps {
  children: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  defaultPosition?: { x: number; y: number };
  className?: string;
  onResize?: (width: number, height: number) => void;
  onDrag?: (x: number, y: number) => void;
}

const DraggableResizable: React.FC<DraggableResizableProps> = ({
  children,
  initialWidth = 320,
  initialHeight = 240,
  minWidth = 200,
  minHeight = 150,
  maxWidth = window.innerWidth,
  maxHeight = window.innerHeight,
  defaultPosition = { x: 50, y: 50 },
  className = '',
  onResize,
  onDrag,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [position, setPosition] = useState(defaultPosition);

  useEffect(() => {
    const handleResize = () => {
      if (nodeRef.current) {
        const parentRect = nodeRef.current.parentElement?.getBoundingClientRect();
        if (parentRect) {
          setPosition(prev => ({
            x: Math.min(prev.x, parentRect.width - size.width),
            y: Math.min(prev.y, parentRect.height - size.height)
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  return (
    <Rnd
      default={{
        x: defaultPosition.x,
        y: defaultPosition.y,
        width: initialWidth,
        height: initialHeight,
      }}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      bounds="parent"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      onResize={(e, direction, ref) => {
        const newSize = {
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        };
        setSize(newSize);
        onResize?.(newSize.width, newSize.height);
      }}
      onDragStop={(e, d) => {
        const newPosition = { x: d.x, y: d.y };
        setPosition(newPosition);
        onDrag?.(newPosition.x, newPosition.y);
      }}
      dragHandleClassName="handle"
      className={className}
      nodeRef={nodeRef}
    >
      <div 
        ref={nodeRef} 
        className={`relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-lg ${className}`}
        style={{ width: '100%', height: '100%' }}
      >
        <div className="handle absolute inset-0 cursor-move">
          {children}
        </div>
      </div>
    </Rnd>
  );
};

export default DraggableResizable;

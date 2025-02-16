'use client';

import { useRef } from 'react';
import { Rnd } from 'react-rnd';

interface DraggableResizableProps {
  children: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  defaultPosition?: { x: number; y: number };
  lockAspectRatio?: boolean;
  className?: string;
}

const DraggableResizable: React.FC<DraggableResizableProps> = ({
  children,
  initialWidth = 320,
  initialHeight = 240,
  minWidth = 200,
  minHeight = 150,
  maxWidth = 640,
  maxHeight = 480,
  defaultPosition = { x: 50, y: 50 },
  lockAspectRatio = false,
  className = '',
}) => {
  const nodeRef = useRef(null);

  return (
    <Rnd
      default={{
        ...defaultPosition,
        width: initialWidth,
        height: initialHeight,
      }}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      bounds="parent"
      lockAspectRatio={lockAspectRatio}
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      className={className}
      nodeRef={nodeRef}
    >
      <div
        ref={nodeRef}
        className="relative border border-gray-700 rounded-lg overflow-hidden shadow-lg bg-black"
      >
        {children}
      </div>
    </Rnd>
  );
};

export default DraggableResizable;

"use client";

import { useRef } from "react";
import { Rnd } from "react-rnd";

const DraggableResizable = ({ children }:   { children: any }) => {
  const nodeRef = useRef(null);

  return (
    <Rnd
      default={{
        x: 50,
        y: 50,
        width: 320,
        height: 240,
      }}
      minWidth={200}
      minHeight={150}
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
      nodeRef={nodeRef}
    >
      <div ref={nodeRef} className="relative border border-gray-400 bg-black">
        {children}
      </div>
    </Rnd>
  );
};

export default DraggableResizable;

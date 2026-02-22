import React from "react";
import { EdgeProps, getBezierPath } from "@xyflow/react";
import { cn } from "@/lib/utils";

export default function CustomEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  animated,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Selection Glow/Background */}
      <path
        d={edgePath}
        fill='none'
        stroke={style.stroke || "#94a3b8"}
        strokeWidth={selected ? 8 : 0}
        strokeOpacity={0.15}
      />

      {/* Interaction Area (Invisible) */}
      <path
        d={edgePath}
        fill='none'
        stroke='transparent'
        strokeWidth={20}
        className='react-flow__edge-interaction'
      />

      {/* Main Edge Line */}
      <path
        d={edgePath}
        fill='none'
        stroke={style.stroke || "#94a3b8"}
        strokeWidth={selected ? 3 : 2}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeDasharray: animated ? "5 5" : "none",
        }}
        className={cn(
          animated && "animate-edge-flow",
          selected ? "opacity-100" : "opacity-80",
        )}
      />

      {/* Selection Highlight */}
      {selected && (
        <path
          d={edgePath}
          fill='none'
          stroke={style.stroke || "#94a3b8"}
          strokeWidth={1}
          strokeOpacity={0.8}
          className='animate-edge-pulse'
        />
      )}
    </>
  );
}

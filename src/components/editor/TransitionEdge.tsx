import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
export function TransitionEdge({
  sourceX: sx,
  sourceY: sy,
  targetX: tx,
  targetY: ty,
  label,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const offset = Number(data?.offset ?? 0),
    loop = data?.loop;
  const mx = (sx + tx) / 2,
    my = (sy + ty) / 2;
  const length = Math.hypot(tx - sx, ty - sy) || 1;
  const cx = mx + ((ty - sy) / length) * (offset + 24),
    cy = my - ((tx - sx) / length) * (offset + 24);
  const path = loop
    ? `M ${sx} ${sy} C ${sx + 125 + offset} ${sy + 95} ${tx + 125 + offset} ${ty - 95} ${tx} ${ty}`
    : `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
  const x = loop ? sx + 94 + offset * 0.75 : (sx + 2 * cx + tx) / 4,
    y = loop ? (sy + ty) / 2 : (sy + 2 * cy + ty) / 4;
  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        className={data?.active ? "active-edge" : ""}
        style={{
          stroke: data?.active
            ? "var(--accent)"
            : selected
              ? "var(--accent-secondary)"
              : "var(--muted)",
          strokeWidth: data?.active || selected ? 2.8 : 1.7,
        }}
      />
      <EdgeLabelRenderer>
        <span
          className="edge-label nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
          }}
        >
          {label}
        </span>
      </EdgeLabelRenderer>
    </>
  );
}

"use client";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { motion, useReducedMotion } from "framer-motion";
type StateData = {
  label: string;
  isStart: boolean;
  isAccept: boolean;
  isActive: boolean;
};
export function StateNode({
  data,
  selected,
}: NodeProps<Node<StateData, "state">>) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`state-node ${data.isActive ? "active" : ""} ${selected ? "selected" : ""}`}
      animate={{ scale: data.isActive && !reduced ? [1, 1.055, 1] : 1 }}
      transition={{ duration: 0.5 }}
      aria-label={`${data.label}${data.isStart ? ", start" : ""}${data.isAccept ? ", accepting" : ""}${data.isActive ? ", active" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        aria-label={`Connect into ${data.label}`}
      />
      {data.isAccept && <span className="accept-ring" />}
      {data.isStart && (
        <span className="start-arrow" aria-hidden="true">
          →
        </span>
      )}
      <span className="state-label">{data.label}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        aria-label={`Connect from ${data.label}`}
      />
    </motion.div>
  );
}

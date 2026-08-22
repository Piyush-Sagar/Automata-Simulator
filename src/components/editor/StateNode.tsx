import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";

type StateNodeData = {
  label: string;
  isStart: boolean;
  isAccept: boolean;
  isActive?: boolean;
};

export type StateNodeType = Node<StateNodeData, "state">;

export function StateNode({ data }: NodeProps<StateNodeType>) {
  return (
    <div
      className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 bg-white text-black transition-colors ${
        data.isActive ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "border-slate-800"
      }`}
    >
      {/* Target handle for incoming edges */}
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0"
        isConnectable={true}
      />

      {data.isAccept && (
        <div className="absolute inset-1 rounded-full border border-slate-800" />
      )}

      {data.isStart && (
        <div className="absolute -left-8 top-1/2 flex -translate-y-1/2 items-center">
          <div className="h-0.5 w-6 bg-slate-800" />
          <div className="h-0 w-0 border-y-4 border-l-[6px] border-y-transparent border-l-slate-800" />
        </div>
      )}

      <span className="font-semibold">{data.label}</span>

      {/* Source handle for outgoing edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0"
        isConnectable={true}
      />
    </div>
  );
}

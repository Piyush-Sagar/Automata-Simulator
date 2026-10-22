"use client";
import {
  Plus,
  ArrowRight,
  Undo2,
  Redo2,
  Trash2,
  LayoutGrid,
  ArrowRightLeft,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useAutomataStore } from "../../store/automataStore";
export function EditorToolbar({
  onTransition,
  onConvert,
}: {
  onTransition: () => void;
  onConvert: () => void;
}) {
  const a = useAutomataStore();
  const flow = useReactFlow();
  return (
    <div className="editor-toolbar">
      <div className="toolbar-tools">
        <button
          className="button tool-create"
          title="Add a state"
          onClick={() => {
            const rect = document
              .querySelector(".automata-canvas")
              ?.getBoundingClientRect();
            const p = flow.screenToFlowPosition({
              x: rect ? rect.left + rect.width / 2 : 400,
              y: rect ? rect.top + rect.height / 2 : 250,
            });
            a.addState(p.x, p.y);
          }}
        >
          <Plus size={16} />
          Add state
        </button>
        <button
          className="button"
          onClick={onTransition}
          disabled={!a.automaton.states.length}
        >
          <ArrowRight size={16} />
          Transition
        </button>
        <span className="toolbar-divider" />
        <button
          className="icon-button"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          disabled={!a.past.length}
          onClick={a.undo}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!a.future.length}
          onClick={a.redo}
        >
          <Redo2 size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Delete selected"
          title="Delete selected"
          disabled={!a.selectedNodes.length && !a.selectedEdges.length}
          onClick={a.deleteSelected}
        >
          <Trash2 size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Arrange states"
          title="Arrange states"
          disabled={!a.automaton.states.length}
          onClick={() => {
            a.updateMachine({
              ...a.automaton,
              states: a.automaton.states.map((s, i) => ({
                ...s,
                x: 100 + (i % 5) * 180,
                y: 100 + Math.floor(i / 5) * 150,
              })),
            });
            requestAnimationFrame(() => void flow.fitView({ padding: 0.3 }));
          }}
        >
          <LayoutGrid size={17} />
        </button>
      </div>
      <button
        className="button convert-action"
        title="Convert / minimize"
        disabled={["PDA", "TM"].includes(a.automaton.type)}
        onClick={onConvert}
      >
        <ArrowRightLeft size={15} />
        <span className="convert-label">Convert / minimize</span>
        <span className="convert-label-short">Convert</span>
      </button>
    </div>
  );
}

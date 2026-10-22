"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAutomataStore } from "../../store/automataStore";
import { useSimulationStore } from "../../store/simulationStore";
import { StateNode } from "./StateNode";
import { TransitionEdge } from "./TransitionEdge";
import type { TransitionDraft } from "./TransitionDialog";
import type { Transition } from "../../store/automataStore";

const nodeTypes = { state: StateNode },
  edgeTypes = { transition: TransitionEdge };
export function transitionLabel(t: Transition) {
  return "symbol" in t
    ? t.symbol
    : "inputSymbol" in t
      ? `${t.inputSymbol}, ${t.stackTop} → ${t.stackReplacement.join("") || "ε"}`
      : `${t.readSymbol} → ${t.writeSymbol}, ${t.direction}`;
}
export function AutomataCanvas({
  onTransition,
}: {
  onTransition: (draft: TransitionDraft) => void;
}) {
  const {
    automaton: a,
    selectedNodes,
    selectedEdges,
    select,
    updateState,
    beginTransaction,
    endTransaction,
  } = useAutomataStore();
  const { simulationResult, currentStepIndex } = useSimulationStore();
  const { screenToFlowPosition, setViewport, viewportInitialized } =
    useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const states = useAutomataStore.getState().automaton.states;
        if (!states.length || !element.clientWidth || !element.clientHeight)
          return;
        const bounds = getNodesBounds(
          states.map((s) => ({
            id: s.id,
            position: { x: s.x, y: s.y },
            data: {},
            width: 76,
            height: 76,
          })),
        );
        void setViewport(
          getViewportForBounds(
            bounds,
            element.clientWidth,
            element.clientHeight,
            0.15,
            1.4,
            0.3,
          ),
        );
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    fit();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [a.id, a.states.length, viewportInitialized, setViewport]);
  const current = simulationResult?.steps[currentStepIndex];
  const nodes: Node[] = useMemo(
    () =>
      a.states.map((s) => ({
        id: s.id,
        type: "state",
        position: { x: s.x, y: s.y },
        selected: selectedNodes.includes(s.id),
        data: {
          label: s.label,
          isStart: s.id === a.startState,
          isAccept: a.acceptStates.includes(s.id),
          isActive: current?.activeStates.includes(s.id) ?? false,
        },
      })),
    [a, selectedNodes, current],
  );
  const edgeOffsets = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const t of a.transitions) {
      const key = JSON.stringify([t.from, t.to].sort());
      const group = groups.get(key) ?? [];
      group.push(t.id);
      groups.set(key, group);
    }
    return new Map(
      [...groups.values()].flatMap((ids) =>
        ids.map((id, i) => [id, i * 30 + (ids.length > 1 ? 24 : 0)] as const),
      ),
    );
  }, [a.transitions]);
  const edges: Edge[] = useMemo(
    () =>
      a.transitions.map((t) => {
        return {
          id: t.id,
          source: t.from,
          target: t.to,
          type: "transition",
          label: transitionLabel(t),
          selected: selectedEdges.includes(t.id),
          data: {
            active: current?.transitionIds.includes(t.id),
            offset: edgeOffsets.get(t.id) ?? 0,
            loop: t.from === t.to,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: current?.transitionIds.includes(t.id)
              ? "var(--accent)"
              : "var(--muted)",
          },
        };
      }),
    [a, selectedEdges, current, edgeOffsets],
  );
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const c of changes) {
        if (c.type === "position" && c.position) updateState(c.id, c.position);
        if (c.type === "select") {
          const s = useAutomataStore.getState();
          select(
            c.selected
              ? [...new Set([...s.selectedNodes, c.id])]
              : s.selectedNodes.filter((id) => id !== c.id),
            s.selectedEdges,
          );
        }
      }
    },
    [updateState, select],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const c of changes)
        if (c.type === "select") {
          const s = useAutomataStore.getState();
          select(
            s.selectedNodes,
            c.selected
              ? [...new Set([...s.selectedEdges, c.id])]
              : s.selectedEdges.filter((id) => id !== c.id),
          );
        }
    },
    [select],
  );
  const onConnect: OnConnect = useCallback(
    (c) => {
      if (c.source && c.target) onTransition({ from: c.source, to: c.target });
    },
    [onTransition],
  );
  return (
    <div
      ref={canvasRef}
      className="automata-canvas"
      data-testid="automata-canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.4 }}
        zoomOnDoubleClick={false}
        minZoom={0.15}
        maxZoom={2}
        deleteKeyCode={null}
        onNodeDragStart={beginTransaction}
        onNodeDragStop={endTransaction}
        onPaneClick={() => select([], [])}
        onEdgeDoubleClick={(_, edge) => onTransition({ id: edge.id })}
        onDoubleClick={(e) => {
          if ((e.target as Element).classList.contains("react-flow__pane")) {
            const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            useAutomataStore.getState().addState(p.x, p.y);
          }
        }}
      >
        <Background gap={24} size={1} color="var(--grid)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor="var(--accent)"
          maskColor="var(--map-mask)"
          pannable
          zoomable
        />
      </ReactFlow>
      {!a.states.length && (
        <div className="canvas-empty">
          <h2>No states yet</h2>
          <p>
            Add a state above, double-click the canvas,
            <br />
            or start with a working example.
          </p>
        </div>
      )}
      <div className="canvas-legend">
        <span className="legend-dot" /> Active state{" "}
        <span className="legend-accept" /> Accepting state{" "}
        <span>Drag handles to connect · double-click an edge to edit</span>
      </div>
    </div>
  );
}

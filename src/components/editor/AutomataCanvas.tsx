import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useAutomataStore } from "../../store/automataStore";
import { useSimulationStore } from "../../store/simulationStore";
import { StateNode } from "./StateNode";
import { TransitionEdge } from "./TransitionEdge";
import type { DFA } from "../../engine/types";

const nodeTypes = {
  state: StateNode,
};

const edgeTypes = {
  transition: TransitionEdge,
};

export function AutomataCanvas() {
  const {
    automaton,
    addState,
    updateState,
    removeState,
    addTransition,
    removeTransition,
  } = useAutomataStore();
  const { simulationResult, currentStepIndex } = useSimulationStore();

  const currentStep = simulationResult?.steps[currentStepIndex];
  const activeStateIds = currentStep ? ("currentState" in currentStep ? [currentStep.currentState] : currentStep.currentStates || []) : [];
  const activeTransitionIds = currentStep ? ("transitionId" in currentStep ? (currentStep.transitionId ? [currentStep.transitionId] : []) : currentStep.transitionIds || []) : [];

  // Derive nodes from automaton
  const nodes: Node[] = useMemo(() => {
    return automaton.states.map((s) => ({
      id: s.id,
      type: "state",
      position: { x: s.x, y: s.y },
      data: {
        label: s.label,
        isStart: s.id === automaton.startState,
        isAccept: automaton.acceptStates.includes(s.id),
        isActive: activeStateIds.includes(s.id),
      },
    }));
  }, [automaton, activeStateIds]);

  // Derive edges from automaton
  const edges: Edge[] = useMemo(() => {
    if (automaton.type !== "DFA" && automaton.type !== "NFA" && automaton.type !== "ENFA") return [];
    return (automaton as DFA).transitions.map((t) => ({
      id: t.id,
      source: t.from,
      target: t.to,
      type: "transition",
      label: t.symbol,
      selected: activeTransitionIds.includes(t.id),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: activeTransitionIds.includes(t.id) ? "#3b82f6" : "#1e293b",
      },
      style: {
        strokeWidth: 2,
        stroke: activeTransitionIds.includes(t.id) ? "#3b82f6" : "#1e293b",
      },
    }));
  }, [automaton, activeTransitionIds]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Handle position updates and deletions
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateState(change.id, {
            x: change.position.x,
            y: change.position.y,
          });
        }
        if (change.type === "remove") {
          removeState(change.id);
        }
      }
    },
    [updateState, removeState],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "remove") {
          removeTransition(change.id);
        }
      }
    },
    [removeTransition],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addTransition(connection.source, connection.target);
      }
    },
    [addTransition],
  );

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Add state at mouse position (very rough estimate without project() function, good enough for Phase 1 start)
      // Ideally we'd use useReactFlow() hook to project client coords to pane coords
      addState(event.clientX - 100, event.clientY - 100); 
    },
    [addState],
  );

  return (
    <div className="h-full w-full bg-slate-50" onDoubleClick={onPaneDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

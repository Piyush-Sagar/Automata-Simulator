import { useReactFlow, useOnSelectionChange } from "@xyflow/react";
import { useState } from "react";
import { useAutomataStore } from "../../store/automataStore";
import type { DFA } from "../../engine/types";

export function PropertiesPanel() {
  const { automaton, updateState, updateTransition, setStartState, toggleAcceptState } = useAutomataStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodeId(nodes.length === 1 ? nodes[0].id : null);
      setSelectedEdgeId(edges.length === 1 ? edges[0].id : null);
    },
  });

  const selectedState = automaton.states.find((s) => s.id === selectedNodeId);
  
  // Transition editing works if it's DFA
  let selectedTransition = null;
  if (automaton.type === "DFA") {
    selectedTransition = (automaton as DFA).transitions.find(
      (t) => t.id === selectedEdgeId,
    );
  }

  if (!selectedState && !selectedTransition) {
    return (
      <div className="w-64 border-l bg-white p-4 text-sm text-slate-500">
        Select a state or transition to edit its properties.
      </div>
    );
  }

  return (
    <div className="w-64 flex-none border-l bg-white p-4">
      <h3 className="mb-4 font-semibold text-slate-800">Properties</h3>
      
      {selectedState && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Label
            </label>
            <input
              type="text"
              value={selectedState.label}
              onChange={(e) =>
                updateState(selectedState.id, { label: e.target.value })
              }
              className="w-full rounded border border-slate-300 p-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={automaton.startState === selectedState.id}
                onChange={() =>
                  setStartState(
                    automaton.startState === selectedState.id
                      ? null
                      : selectedState.id,
                  )
                }
              />
              <span>Is Start State</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={automaton.acceptStates.includes(selectedState.id)}
                onChange={() => toggleAcceptState(selectedState.id)}
              />
              <span>Is Accepting State</span>
            </label>
          </div>
        </div>
      )}

      {selectedTransition && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Input Symbol
            </label>
            <input
              type="text"
              value={selectedTransition.symbol}
              onChange={(e) =>
                updateTransition(selectedTransition.id, {
                  symbol: e.target.value,
                })
              }
              className="w-full rounded border border-slate-300 p-2 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

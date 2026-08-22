import { PlusCircle, Trash2, Settings, ArrowRightLeft, Minimize2 } from "lucide-react";
import { useAutomataStore } from "../../store/automataStore";
import { useOnSelectionChange, useReactFlow } from "@xyflow/react";
import { useState, useCallback } from "react";
import type { AutomatonType } from "../../engine/types";
import { ConversionModal } from "../conversion/ConversionModal";
import { MinimizationModal } from "../minimization/MinimizationModal";

export function EditorToolbar() {
  const { addState, removeState, removeTransition, automaton, setAutomatonType } = useAutomataStore();
  const { screenToFlowPosition } = useReactFlow();

  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  
  const [showConversion, setShowConversion] = useState(false);
  const [showMinimization, setShowMinimization] = useState(false);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes.map((n) => n.id));
      setSelectedEdges(edges.map((e) => e.id));
    },
  });

  const handleAddState = () => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addState(position.x, position.y);
  };

  const handleDelete = useCallback(() => {
    selectedNodes.forEach((id) => removeState(id));
    selectedEdges.forEach((id) => removeTransition(id));
  }, [selectedNodes, selectedEdges, removeState, removeTransition]);

  return (
    <>
      <div className="flex h-12 items-center gap-2 border-b bg-white px-4 shadow-sm">
        <div className="font-semibold text-slate-700 mr-2 flex items-center gap-2">
          {automaton.name}
          <select 
            value={automaton.type}
            onChange={(e) => setAutomatonType(e.target.value as AutomatonType)}
            className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="DFA">DFA</option>
            <option value="NFA">NFA</option>
            <option value="ENFA">ε-NFA</option>
          </select>
        </div>
        
        <div className="h-6 w-px bg-slate-300 mx-2" />

        <button
          onClick={handleAddState}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <PlusCircle className="h-4 w-4" />
          Add State
        </button>

        <button
          onClick={handleDelete}
          disabled={selectedNodes.length === 0 && selectedEdges.length === 0}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <Trash2 className="h-4 w-4" />
          Delete Selected
        </button>

        <div className="flex-1" />

        {(automaton.type === "NFA" || automaton.type === "ENFA") && (
          <button 
            onClick={() => setShowConversion(true)}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Convert to DFA
          </button>
        )}

        {automaton.type === "DFA" && (
          <button 
            onClick={() => setShowMinimization(true)}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200"
          >
            <Minimize2 className="h-4 w-4" />
            Minimize DFA
          </button>
        )}

        <div className="h-6 w-px bg-slate-300 mx-2" />

        <button className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {showConversion && <ConversionModal onClose={() => setShowConversion(false)} />}
      {showMinimization && <MinimizationModal onClose={() => setShowMinimization(false)} />}
    </>
  );
}

import { useState } from "react";
import { useAutomataStore } from "../../store/automataStore";
import { minimizeDFA, type MinimizationTrace } from "../../engine/dfa/minimize";
import type { DFA } from "../../engine/types";
import { validateDFA } from "../../engine/dfa/validate";

export function MinimizationModal({ onClose }: { onClose: () => void }) {
  const { automaton, setAutomaton } = useAutomataStore();
  const [result, setResult] = useState<{ dfa: DFA; trace: MinimizationTrace } | { error: string } | null>(null);

  const handleMinimize = () => {
    if (automaton.type !== "DFA") return;
    
    const errors = validateDFA(automaton as DFA);
    if (errors.length > 0) {
      setResult({ error: "Cannot minimize invalid DFA:\n" + errors.map(e => e.message).join("\n") });
      return;
    }

    const minResult = minimizeDFA(automaton as DFA);
    setResult(minResult);
  };

  const applyDFA = (dfa: DFA) => {
    if (confirm("Replace current automaton with the minimized DFA?")) {
      setAutomaton(dfa);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b p-4 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">DFA Minimization</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 font-bold text-xl">&times;</button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {!result ? (
            <div className="text-center py-8">
              <p className="mb-4 text-slate-600">Apply Hopcroft's Partition Refinement algorithm to minimize this DFA.</p>
              <button 
                onClick={handleMinimize}
                className="rounded bg-indigo-600 px-6 py-2 font-semibold text-white hover:bg-indigo-700"
              >
                Start Minimization
              </button>
            </div>
          ) : "error" in result ? (
            <div className="text-red-600 whitespace-pre-wrap">{result.error}</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-2">Partition Refinement Steps</h3>
                <div className="space-y-4">
                  {result.trace.steps.map((step, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded border font-mono text-sm">
                      <div className="font-bold text-slate-500 mb-1">Step {i}:</div>
                      {step.partitions.map((p, j) => (
                        <div key={j}>P{j} = {"{"}{p.join(", ")}{"}"}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-2">Minimized DFA Overview</h3>
                <p>States: {result.dfa.states.length} (Original: {automaton.states.length})</p>
                <p>Transitions: {result.dfa.transitions.length}</p>
              </div>
            </div>
          )}
        </div>

        {result && !("error" in result) && (
          <div className="border-t bg-slate-50 p-4 flex justify-end gap-3">
            <button onClick={onClose} className="rounded px-4 py-2 font-medium text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
            <button 
              onClick={() => applyDFA(result.dfa)}
              className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            >
              Replace Automaton with Minimized DFA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

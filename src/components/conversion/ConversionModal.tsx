import { useState } from "react";
import { useAutomataStore } from "../../store/automataStore";
import { subsetConstruction, type SubsetConstructionTrace } from "../../engine/nfa/subsetConstruction";
import type { DFA, ENFA, NFA } from "../../engine/types";
import { validateNFA } from "../../engine/nfa/validate";

export function ConversionModal({ onClose }: { onClose: () => void }) {
  const { automaton, setAutomaton } = useAutomataStore();
  const [result, setResult] = useState<{ dfa: DFA; trace: SubsetConstructionTrace } | { error: string } | null>(null);

  const handleConvert = () => {
    if (automaton.type !== "NFA" && automaton.type !== "ENFA") return;
    
    const errors = validateNFA(automaton as NFA | ENFA);
    if (errors.length > 0) {
      setResult({ error: "Cannot convert invalid NFA:\n" + errors.map(e => e.message).join("\n") });
      return;
    }

    const conversionResult = subsetConstruction(automaton as NFA | ENFA);
    setResult(conversionResult);
  };

  const applyDFA = (dfa: DFA) => {
    if (confirm("Replace current automaton with the generated DFA?")) {
      setAutomaton(dfa);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b p-4 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">NFA to DFA Conversion</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 font-bold text-xl">&times;</button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {!result ? (
            <div className="text-center py-8">
              <p className="mb-4 text-slate-600">Convert the current {automaton.type} to a Deterministic Finite Automaton using Subset Construction.</p>
              <button 
                onClick={handleConvert}
                className="rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Start Conversion
              </button>
            </div>
          ) : "error" in result ? (
            <div className="text-red-600 whitespace-pre-wrap">{result.error}</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-2">Subset Mapping Trace</h3>
                <ul className="space-y-1 text-sm font-mono bg-slate-50 p-4 rounded border">
                  {Array.from(result.trace.mapping.entries()).map(([dfaState, nfaStates]) => (
                    <li key={dfaState}>
                      <span className="font-bold text-blue-600">{dfaState}</span> = {"{"}{nfaStates.join(", ")}{"}"}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-2">Generated DFA Overview</h3>
                <p>States: {result.dfa.states.length}</p>
                <p>Transitions: {result.dfa.transitions.length}</p>
                <p>Accepting States: {result.dfa.acceptStates.length}</p>
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
              Replace Automaton with DFA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

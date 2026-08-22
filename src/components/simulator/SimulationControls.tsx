import { useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { useAutomataStore } from "../../store/automataStore";
import { useSimulationStore } from "../../store/simulationStore";
import { simulateDFA } from "../../engine/dfa/simulate";
import { simulateNFA } from "../../engine/nfa/simulate";
import type { DFA } from "../../engine/types";

export function SimulationControls() {
  const { automaton, validate } = useAutomataStore();
  const {
    inputString,
    setInputString,
    simulationResult,
    setSimulationResult,
    currentStepIndex,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    resetSimulation,
  } = useSimulationStore();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        stepForward();
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, stepForward]);

  const handleRun = () => {
    const errors = validate();
    if (errors.length > 0) {
      alert("Invalid Automaton:\n" + errors.map((e) => e.message).join("\n"));
      return;
    }

    let result;
    if (automaton.type === "DFA") {
      result = simulateDFA(automaton as DFA, inputString);
    } else if (automaton.type === "NFA" || automaton.type === "ENFA") {
      result = simulateNFA(automaton, inputString);
    } else {
      return;
    }
    
    setSimulationResult(result);
  };

  const handleStop = () => {
    setSimulationResult(null);
  };

  const isSimulating = simulationResult !== null;
  const isFinished = isSimulating && currentStepIndex === simulationResult.steps.length - 1;

  return (
    <div className="flex flex-col gap-4 border-t bg-white p-4 shadow-inner">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="sim-input" className="font-medium text-slate-700">
            Input:
          </label>
          <input
            id="sim-input"
            type="text"
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            disabled={isSimulating}
            className="rounded border border-slate-300 px-3 py-1 font-mono text-sm disabled:bg-slate-100"
            placeholder="e.g. 101101"
          />
        </div>

        {!isSimulating ? (
          <button
            onClick={handleRun}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Run Simulation
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="rounded bg-slate-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Stop
          </button>
        )}

        {isSimulating && (
          <div className="flex items-center gap-2 border-l pl-4">
            <button
              onClick={resetSimulation}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
              title="Reset"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={stepBackward}
              disabled={currentStepIndex === 0}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              title="Step Backward"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={isFinished}
              className="rounded bg-blue-100 p-1.5 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={stepForward}
              disabled={isFinished}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              title="Step Forward"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
        )}
        
        {isSimulating && (
          <div className="flex items-center gap-2 border-l pl-4">
             <label className="text-sm text-slate-600">Speed:</label>
             <input 
               type="range"
               min="200"
               max="2000"
               step="200"
               value={2200 - playbackSpeed} // Reverse so right is faster
               onChange={(e) => setPlaybackSpeed(2200 - Number(e.target.value))}
               className="w-24"
             />
          </div>
        )}
      </div>

      {isSimulating && (
        <div className="rounded border bg-slate-50 p-3 font-mono text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Execution Trace</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                simulationResult.status === "ACCEPTED"
                  ? "bg-green-100 text-green-700"
                  : simulationResult.status === "REJECTED"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {simulationResult.status}
            </span>
          </div>
          <div className="text-slate-600">
            {simulationResult.steps[currentStepIndex] ? (
               <div>
                  Step {currentStepIndex}: State(s) <strong>
                    {"currentState" in simulationResult.steps[currentStepIndex] 
                      ? (simulationResult.steps[currentStepIndex] as any).currentState 
                      : (simulationResult.steps[currentStepIndex] as any).currentStates?.join(", ")}
                  </strong> 
                  {simulationResult.steps[currentStepIndex].inputSymbol ? ` reading '${simulationResult.steps[currentStepIndex].inputSymbol}'` : ''}
               </div>
            ) : null}
            {isFinished && <div className="mt-2 font-medium">{simulationResult.message}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

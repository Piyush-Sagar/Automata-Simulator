"use client";
import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Square,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAutomataStore } from "../../store/automataStore";
import { useSimulationStore } from "../../store/simulationStore";
import { usePreferencesStore } from "../../store/preferencesStore";
import { simulateMachine } from "../../engine/simulate";

export function runCurrentMachine() {
  const a = useAutomataStore.getState().automaton,
    s = useSimulationStore.getState();
  s.setSimulationResult(
    simulateMachine(a, s.inputString, usePreferencesStore.getState().settings),
  );
}
export function SimulationControls() {
  const a = useAutomataStore((s) => s.automaton);
  const s = useSimulationStore();
  const [configuration, setConfiguration] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!s.isPlaying) return;
    const timer = setInterval(s.stepForward, s.playbackSpeed);
    return () => clearInterval(timer);
  }, [s.isPlaying, s.playbackSpeed, s.stepForward]);
  const result = s.simulationResult,
    step = result?.steps[s.currentStepIndex];
  const label = (id: string) =>
    a.states.find((st) => st.id === id)?.label ?? id;
  const config =
    step?.configurations?.[
      Math.min(configuration, (step.configurations?.length ?? 1) - 1)
    ];
  const inputIndex = config?.inputIndex ?? step?.inputIndex ?? 0;
  const symbols = Array.from(s.inputString);
  const page = Math.floor(s.currentStepIndex / 100),
    slice = result?.steps.slice(page * 100, page * 100 + 100) ?? [];
  return (
    <section className="simulation-dock" aria-label="Simulation controls">
      <div className="simulation-top">
        <div className="simulation-input">
          <label htmlFor="sim-input" className="eyebrow">
            Input
          </label>
          <div className="input-action">
            <input
              id="sim-input"
              value={s.inputString}
              onChange={(e) => s.setInputString(e.target.value)}
              placeholder="Enter input · empty input is allowed"
              onKeyDown={(e) => {
                if (e.key === "Enter") runCurrentMachine();
              }}
            />
            <button className="button primary" onClick={runCurrentMachine}>
              <Play size={15} />
              Run
            </button>
          </div>
        </div>
        <div className="transport">
          <button
            className="icon-button"
            title="Reset (R)"
            aria-label="Reset playback"
            disabled={!step}
            onClick={s.resetSimulation}
          >
            <RotateCcw size={17} />
          </button>
          <button
            className="icon-button"
            title="Previous step (←)"
            aria-label="Previous step"
            disabled={!step || s.currentStepIndex === 0}
            onClick={s.stepBackward}
          >
            <SkipBack size={17} />
          </button>
          <button
            className="button playback"
            aria-label={s.isPlaying ? "Pause playback" : "Play playback"}
            disabled={
              !step || s.currentStepIndex >= (result?.steps.length ?? 0) - 1
            }
            onClick={() => s.setIsPlaying(!s.isPlaying)}
          >
            {s.isPlaying ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            className="icon-button"
            title="Next step (→)"
            aria-label="Next step"
            disabled={
              !step || s.currentStepIndex >= (result?.steps.length ?? 0) - 1
            }
            onClick={s.stepForward}
          >
            <SkipForward size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Clear simulation"
            disabled={!result}
            onClick={() => s.setSimulationResult(null)}
          >
            <Square size={15} />
          </button>
        </div>
        <label className="speed-control">
          Playback speed
          <select
            value={s.playbackSpeed}
            onChange={(e) => s.setPlaybackSpeed(Number(e.target.value))}
          >
            <option value={1400}>Slow</option>
            <option value={700}>Normal</option>
            <option value={250}>Fast</option>
          </select>
        </label>
        <div
          className={`result-badge ${result?.status.toLowerCase() ?? "idle"}`}
          role="status"
        >
          {result?.status ?? "READY TO RUN"}
        </div>
      </div>
      {!result ? (
        <p className="simulation-empty">
          Enter input and click Run to view the execution trace.
        </p>
      ) : (
        <>
          <p
            className={
              result.status === "ERROR" ? "error-box" : "result-message"
            }
            role={result.status === "ERROR" ? "alert" : undefined}
          >
            {result.message}
          </p>
          {step && (
            <div className="execution-layout">
              <div className="configuration-view">
                <div className="section-title">
                  <h3>
                    Configuration{" "}
                    <span className="muted">
                      {s.currentStepIndex} / {result.steps.length - 1}
                    </span>
                  </h3>
                  <span className="pill">
                    {step.activeStates.map(label).join(", ") || "∅"}
                  </span>
                </div>
                {a.type !== "TM" && (
                  <div
                    className="input-tape"
                    aria-label={`Input consumed: ${inputIndex} of ${symbols.length}`}
                  >
                    {symbols.length ? (
                      symbols.map((c, i) => (
                        <span
                          key={i}
                          className={`${i < inputIndex ? "consumed" : ""} ${i === inputIndex ? "cursor" : ""}`}
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span>ε</span>
                    )}
                    {inputIndex >= symbols.length && (
                      <span className="muted">end</span>
                    )}
                  </div>
                )}
                {a.type === "ENFA" && (
                  <p className="muted">
                    ε-closure after this step:{" "}
                    {`{${step.activeStates.map(label).join(", ")}}`}. ε rules
                    consume no input.
                  </p>
                )}
                {step.configurations && (
                  <div className="pda-view">
                    <label>
                      Reachable configuration
                      <select
                        value={Math.min(
                          configuration,
                          step.configurations.length - 1,
                        )}
                        onChange={(e) =>
                          setConfiguration(Number(e.target.value))
                        }
                      >
                        {step.configurations.map((c, i) => (
                          <option value={i} key={i}>
                            {label(c.state)} · input {c.inputIndex} · stack{" "}
                            {c.stack.join("") || "ε"}
                            {c.inputIndex === symbols.length &&
                            (a.type === "PDA" &&
                            a.acceptanceMode === "EMPTY_STACK"
                              ? !c.stack.length
                              : a.acceptStates.includes(c.state))
                              ? " · accepting"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="stack-view">
                      <span className="eyebrow">STACK · TOP FIRST</span>
                      {config?.stack.length ? (
                        [...config.stack].reverse().map((symbol, i) => (
                          <motion.span
                            key={`${i}-${symbol}`}
                            initial={reduced ? false : { opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="stack-cell"
                          >
                            {symbol}
                          </motion.span>
                        ))
                      ) : (
                        <span className="muted">Empty stack</span>
                      )}
                    </div>
                  </div>
                )}
                {step.tape && (
                  <div className="tm-view">
                    <span className="eyebrow">TAPE · HEAD AT {step.head}</span>
                    <div className="tape-cells">
                      {Array.from(
                        { length: 11 },
                        (_, i) => (step.head ?? 0) + i - 5,
                      ).map((index) => (
                        <div
                          className={`tape-cell ${index === step.head ? "head" : ""}`}
                          key={index}
                        >
                          <small>{index}</small>
                          <motion.span
                            key={`${index}-${new Map(step.tape).get(index)}`}
                            initial={reduced ? false : { opacity: 0.3 }}
                            animate={{ opacity: 1 }}
                          >
                            {new Map(step.tape).get(index) ??
                              (a.type === "TM" ? a.blankSymbol : "□")}
                          </motion.span>
                          {index === step.head && (
                            <b aria-label="Tape head">▲</b>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="trace-view">
                <div className="section-title">
                  <h3>Execution trace</h3>
                  <label className="trace-page">
                    Page
                    <select
                      aria-label="Trace page"
                      value={page}
                      onChange={(e) =>
                        s.setCurrentStepIndex(Number(e.target.value) * 100)
                      }
                    >
                      {Array.from(
                        { length: Math.ceil(result.steps.length / 100) },
                        (_, i) => (
                          <option key={i} value={i}>
                            {i + 1}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
                <div className="trace-list">
                  {slice.map((row) => (
                    <button
                      key={row.step}
                      className={`trace-row ${row.step === s.currentStepIndex ? "current" : ""}`}
                      aria-current={
                        row.step === s.currentStepIndex ? "step" : undefined
                      }
                      onClick={() => s.setCurrentStepIndex(row.step)}
                    >
                      <span>{String(row.step).padStart(2, "0")}</span>
                      <span>
                        {row.description}
                        <small>
                          {row.activeStates.map(label).join(", ") || "∅"}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

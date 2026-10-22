"use client";
import { useAutomataStore } from "../../store/automataStore";
import { transitionLabel } from "./AutomataCanvas";
import type { TransitionDraft } from "./TransitionDialog";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
export function PropertiesPanel({
  onTransition,
}: {
  onTransition: (draft: TransitionDraft) => void;
}) {
  const {
    automaton: a,
    selectedNodes,
    selectedEdges,
    select,
    updateMachine,
    setAutomatonType,
    updateState,
    setStartState,
    toggleAcceptState,
    removeState,
    removeTransition,
    beginTransaction,
    endTransaction,
  } = useAutomataStore();
  const state = a.states.find(
    (s) => selectedNodes.length === 1 && selectedNodes[0] === s.id,
  );
  const edge = a.transitions.find(
    (t) => selectedEdges.length === 1 && selectedEdges[0] === t.id,
  );
  const label = (id: string) => a.states.find((s) => s.id === id)?.label ?? id;
  return (
    <aside className="properties-panel" aria-label="Machine properties">
      <div className="panel-heading">
        <span className="eyebrow">INSPECTOR</span>
        <span className="pill">{a.type === "ENFA" ? "ε-NFA" : a.type}</span>
      </div>
      <section>
        <h2>
          {state
            ? "State properties"
            : edge
              ? "Transition properties"
              : "Machine properties"}
        </h2>
        {state ? (
          <div className="form-stack">
            <label>
              State label
              <input
                value={state.label}
                onFocus={beginTransaction}
                onBlur={endTransaction}
                onChange={(e) =>
                  updateState(state.id, { label: e.target.value })
                }
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={a.startState === state.id}
                onChange={() =>
                  setStartState(a.startState === state.id ? null : state.id)
                }
              />
              Start state
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={a.acceptStates.includes(state.id)}
                onChange={() => toggleAcceptState(state.id)}
              />
              Accepting state
            </label>
            <div className="form-grid">
              <label>
                X position
                <input
                  type="number"
                  value={Math.round(state.x)}
                  onChange={(e) =>
                    updateState(state.id, { x: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Y position
                <input
                  type="number"
                  value={Math.round(state.y)}
                  onChange={(e) =>
                    updateState(state.id, { y: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <button
              className="button danger"
              onClick={() => removeState(state.id)}
            >
              <Trash2 size={15} />
              Delete state
            </button>
            <button className="text-button" onClick={() => select([], [])}>
              Back to machine
            </button>
          </div>
        ) : edge ? (
          <div className="form-stack">
            <p>
              {label(edge.from)} → {label(edge.to)}
            </p>
            <code className="rule-preview">{transitionLabel(edge)}</code>
            <button
              className="button primary"
              onClick={() => onTransition({ id: edge.id })}
            >
              Edit rule
            </button>
            <button
              className="button danger"
              onClick={() => removeTransition(edge.id)}
            >
              Delete transition
            </button>
            <button className="text-button" onClick={() => select([], [])}>
              Back to machine
            </button>
          </div>
        ) : (
          <div className="form-stack">
            {a.type !== "PDA" && a.type !== "TM" && (
              <label>
                Machine model
                <select
                  value={a.type}
                  onChange={(e) =>
                    setAutomatonType(e.target.value as "DFA" | "NFA" | "ENFA")
                  }
                >
                  <option value="DFA">DFA</option>
                  <option value="NFA">NFA</option>
                  <option value="ENFA">ε-NFA</option>
                </select>
              </label>
            )}
            <label>
              Machine name
              <input
                value={a.name}
                onFocus={beginTransaction}
                onBlur={endTransaction}
                onChange={(e) => updateMachine({ ...a, name: e.target.value })}
              />
            </label>
            <label>
              Input alphabet
              <input
                key={a.alphabet.join(",")}
                aria-describedby="alphabet-help"
                defaultValue={a.alphabet.join(",")}
                onFocus={beginTransaction}
                onBlur={(e) => {
                  updateMachine({
                    ...a,
                    alphabet: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                  endTransaction();
                }}
              />
            </label>
            <p className="field-help" id="alphabet-help">
              Single characters, separated by commas. Apply by leaving the
              field. ε means empty input.
            </p>
            {a.type === "PDA" && (
              <>
                <label>
                  Stack alphabet
                  <input
                    key={a.stackAlphabet.join(",")}
                    defaultValue={a.stackAlphabet.join(",")}
                    onBlur={(e) =>
                      updateMachine({
                        ...a,
                        stackAlphabet: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
                <label>
                  Initial stack symbol
                  <input
                    value={a.initialStackSymbol}
                    onChange={(e) =>
                      updateMachine({
                        ...a,
                        initialStackSymbol: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Acceptance
                  <select
                    value={a.acceptanceMode}
                    onChange={(e) =>
                      updateMachine({
                        ...a,
                        acceptanceMode: e.target
                          .value as typeof a.acceptanceMode,
                      })
                    }
                  >
                    <option value="FINAL_STATE">
                      Final state + all input read
                    </option>
                    <option value="EMPTY_STACK">
                      Empty stack + all input read
                    </option>
                  </select>
                </label>
              </>
            )}
            {a.type === "TM" && (
              <>
                <label>
                  Blank symbol
                  <input
                    value={a.blankSymbol}
                    onChange={(e) =>
                      updateMachine({ ...a, blankSymbol: e.target.value })
                    }
                  />
                </label>
                <label>
                  Reject state
                  <select
                    value={a.rejectState ?? ""}
                    onChange={(e) =>
                      updateMachine({
                        ...a,
                        rejectState: e.target.value || null,
                      })
                    }
                  >
                    <option value="">None — missing rule rejects</option>
                    {a.states.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        )}
      </section>
      <section>
        <div className="section-title">
          <h3>
            States <span className="muted">{a.states.length}</span>
          </h3>
        </div>
        <div className="state-list">
          {a.states.map((s) => (
            <button
              key={s.id}
              className={`state-row ${selectedNodes.includes(s.id) ? "chosen" : ""}`}
              onClick={() => select([s.id], [])}
            >
              <span>
                {s.isStart ? "→ " : ""}
                {s.label}
              </span>
              <span className="muted">{s.isAccept ? "accept" : "state"}</span>
            </button>
          ))}
          {!a.states.length && (
            <p className="muted">Your states will appear here.</p>
          )}
        </div>
      </section>
      <section>
        <div className="section-title">
          <h3>
            Transitions <span className="muted">{a.transitions.length}</span>
          </h3>
          <button
            className="icon-button"
            aria-label="Add transition from inspector"
            disabled={!a.states.length}
            onClick={() => onTransition({})}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="transition-list">
          {a.transitions.map((t) => (
            <button
              key={t.id}
              className={`transition-row ${selectedEdges.includes(t.id) ? "chosen" : ""}`}
              onClick={() => select([], [t.id])}
            >
              <span>
                {label(t.from)} <ArrowRight size={12} /> {label(t.to)}
              </span>
              <code>{transitionLabel(t)}</code>
            </button>
          ))}
          {!a.transitions.length && (
            <p className="muted">Connect states to define the rules.</p>
          )}
        </div>
      </section>
    </aside>
  );
}

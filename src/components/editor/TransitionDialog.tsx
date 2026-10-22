"use client";
import { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { useAutomataStore, type Transition } from "../../store/automataStore";
import { createId } from "../../engine/common/utilities";
import { validateAutomaton } from "../../engine/common/validation";

export interface TransitionDraft {
  from?: string;
  to?: string;
  id?: string;
}
export function TransitionDialog({
  draft,
  onClose,
}: {
  draft: TransitionDraft;
  onClose: () => void;
}) {
  const { automaton: a, putTransition } = useAutomataStore();
  const existing = a.transitions.find((t) => t.id === draft.id);
  const [from, setFrom] = useState(
    existing?.from ?? draft.from ?? a.states[0]?.id ?? "",
  );
  const [to, setTo] = useState(
    existing?.to ?? draft.to ?? a.states[1]?.id ?? a.states[0]?.id ?? "",
  );
  const [symbol, setSymbol] = useState(
    existing && "symbol" in existing
      ? existing.symbol
      : existing && "inputSymbol" in existing
        ? existing.inputSymbol
        : (a.alphabet[0] ?? "ε"),
  );
  const [stackTop, setStackTop] = useState(
    existing && "stackTop" in existing
      ? existing.stackTop
      : a.type === "PDA"
        ? a.initialStackSymbol
        : "",
  );
  const [replacement, setReplacement] = useState(
    existing && "stackReplacement" in existing
      ? existing.stackReplacement.join("")
      : "",
  );
  const [read, setRead] = useState(
    existing && "readSymbol" in existing
      ? existing.readSymbol
      : a.type === "TM"
        ? a.blankSymbol
        : "",
  );
  const [write, setWrite] = useState(
    existing && "writeSymbol" in existing
      ? existing.writeSymbol
      : a.type === "TM"
        ? a.blankSymbol
        : "",
  );
  const [direction, setDirection] = useState<"L" | "R" | "S">(
    existing && "direction" in existing ? existing.direction : "R",
  );
  const [error, setError] = useState("");
  const options = [
    ...a.alphabet,
    ...(["ENFA", "PDA"].includes(a.type) ? ["ε"] : []),
  ];
  return (
    <Dialog
      title={existing ? "Edit transition" : "Create transition"}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!from || !to) {
            setError("Choose a source and destination state first.");
            return;
          }
          const base = { id: existing?.id ?? createId("transition"), from, to };
          const t: Transition =
            a.type === "PDA"
              ? {
                  ...base,
                  inputSymbol: symbol,
                  stackTop,
                  stackReplacement: Array.from(replacement),
                }
              : a.type === "TM"
                ? { ...base, readSymbol: read, writeSymbol: write, direction }
                : { ...base, symbol };
          const candidate = {
            ...a,
            transitions: [
              ...a.transitions.filter((t) => t.id !== existing?.id),
              t,
            ],
          } as typeof a;
          const errors = validateAutomaton(candidate).filter(
            (e) => e.transitionId === t.id,
          );
          if (errors.length) {
            setError(errors.map((e) => e.message).join(" "));
            return;
          }
          putTransition(t);
          onClose();
        }}
      >
        <p className="muted">
          Choose the rule the machine will follow. A transition can return to
          the same state.
        </p>
        <div className="form-grid">
          <label>
            From state
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            >
              <option value="" disabled>
                Choose a state
              </option>
              {a.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            To state
            <select value={to} onChange={(e) => setTo(e.target.value)} required>
              <option value="" disabled>
                Choose a state
              </option>
              {a.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {a.type !== "TM" ? (
          <label>
            Input symbol
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            >
              {options.map((s) => (
                <option key={s} value={s}>
                  {s === "ε" ? "ε — consume no input" : s}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <div className="form-grid">
              <label>
                Read symbol
                <input
                  required
                  value={read}
                  onChange={(e) => setRead(e.target.value)}
                />
              </label>
              <label>
                Write symbol
                <input
                  required
                  value={write}
                  onChange={(e) => setWrite(e.target.value)}
                />
              </label>
            </div>
            <p className="muted">
              One character per cell. Blank: {a.blankSymbol}. Work symbols may
              differ from the input alphabet.
            </p>
            <label>
              Head movement
              <select
                value={direction}
                onChange={(e) =>
                  setDirection(e.target.value as typeof direction)
                }
              >
                <option value="L">Left</option>
                <option value="R">Right</option>
                <option value="S">Stay</option>
              </select>
            </label>
          </>
        )}
        {a.type === "PDA" && (
          <>
            <label>
              Pop stack top
              <select
                value={stackTop}
                onChange={(e) => setStackTop(e.target.value)}
              >
                {a.stackAlphabet.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Push replacement
              <input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Empty means pop only"
              />
            </label>
            <p className="muted">
              Use stack alphabet {a.stackAlphabet.join(", ")}. Write bottom to
              top; the rightmost symbol becomes the top.
            </p>
          </>
        )}
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={!a.states.length}
          >
            Save transition
          </button>
        </div>
      </form>
    </Dialog>
  );
}

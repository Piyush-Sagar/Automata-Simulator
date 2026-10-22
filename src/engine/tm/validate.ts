import type { TuringMachine } from "../types";
import {
  validateStructure,
  validateAlphabet,
  checkTransitionEndpoints,
} from "../common/sharedChecks";

export function validateTM(a: TuringMachine) {
  const errors = [
    ...validateStructure(a),
    ...validateAlphabet(a),
    ...checkTransitionEndpoints(a, a.transitions),
  ];
  const fail = (message: string, transitionId?: string) =>
    errors.push({ type: "invalid-tm", message, transitionId });
  if (
    Array.from(a.blankSymbol).length !== 1 ||
    a.blankSymbol === "ε" ||
    a.alphabet.includes(a.blankSymbol)
  )
    fail(
      "Blank must be a single tape symbol outside the input alphabet, other than ε.",
    );
  if (
    a.rejectState &&
    (!a.states.some((s) => s.id === a.rejectState) ||
      a.acceptStates.includes(a.rejectState))
  )
    fail("Reject state must exist and cannot also accept.");
  const seen = new Set<string>();
  for (const t of a.transitions) {
    const key = JSON.stringify([t.from, t.readSymbol]);
    if (seen.has(key))
      fail(
        `State ${a.states.find((s) => s.id === t.from)?.label} has multiple transitions reading '${t.readSymbol}'.`,
        t.id,
      );
    seen.add(key);
    if (
      [t.readSymbol, t.writeSymbol].some(
        (s) => Array.from(s).length !== 1 || s === "ε",
      )
    )
      fail("Tape symbols must be single characters other than ε.", t.id);
    if (!["L", "R", "S"].includes(t.direction))
      fail("Direction must be L, R or S.", t.id);
  }
  return errors;
}

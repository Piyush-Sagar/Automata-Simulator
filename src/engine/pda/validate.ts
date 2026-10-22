import type { PDA } from "../types";
import {
  validateStructure,
  validateAlphabet,
  checkTransitionEndpoints,
  type ValidationError,
} from "../common/sharedChecks";

export function validatePDA(a: PDA): ValidationError[] {
  const errors = [
    ...validateStructure(a),
    ...validateAlphabet(a),
    ...checkTransitionEndpoints(a, a.transitions),
  ];
  const fail = (message: string, transitionId?: string) =>
    errors.push({ type: "invalid-pda", message, transitionId });
  if (!a.stackAlphabet.includes(a.initialStackSymbol))
    fail("Initial stack symbol must belong to the stack alphabet.");
  if (
    new Set(a.stackAlphabet).size !== a.stackAlphabet.length ||
    a.stackAlphabet.some((s) => Array.from(s).length !== 1 || s === "ε")
  )
    fail(
      "Stack alphabet must contain distinct single characters other than ε.",
    );
  for (const t of a.transitions) {
    if (t.inputSymbol !== "ε" && !a.alphabet.includes(t.inputSymbol))
      fail(`Input '${t.inputSymbol}' is outside the alphabet.`, t.id);
    if (
      !a.stackAlphabet.includes(t.stackTop) ||
      t.stackReplacement.some((s) => !a.stackAlphabet.includes(s))
    )
      fail("Stack symbols must belong to the stack alphabet.", t.id);
  }
  return errors;
}

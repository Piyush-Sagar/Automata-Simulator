import { EPSILON, type DFA } from "../types";
import {
  checkTransitionEndpoints,
  validateAlphabet,
  validateStructure,
  type ValidationError,
} from "../common/sharedChecks";

export function validateDFA(dfa: DFA): ValidationError[] {
  const errors: ValidationError[] = [
    ...validateStructure(dfa),
    ...validateAlphabet(dfa),
    ...checkTransitionEndpoints(
      dfa,
      dfa.transitions.map((t) => ({ id: t.id, from: t.from, to: t.to })),
    ),
  ];

  const alphabet = new Set(dfa.alphabet);
  const seen = new Map<string, string>();

  for (const t of dfa.transitions) {
    if (t.symbol === EPSILON) {
      errors.push({
        type: "epsilon-in-dfa",
        message:
          "A DFA cannot have epsilon (ε) transitions. Use an ε-NFA instead.",
        transitionId: t.id,
      });
      continue;
    }
    if (!alphabet.has(t.symbol)) {
      errors.push({
        type: "symbol-not-in-alphabet",
        message: `Transition uses symbol '${t.symbol}' which is not in the alphabet {${dfa.alphabet.join(", ")}}.`,
        transitionId: t.id,
      });
    }
    const key = `${t.from}::${t.symbol}`;
    const previous = seen.get(key);
    if (previous !== undefined) {
      errors.push({
        type: "duplicate-transition",
        message: `State ${labelOf(dfa, t.from)} has two transitions for input symbol '${t.symbol}'. A DFA must be deterministic.`,
        stateId: t.from,
        transitionId: t.id,
      });
    } else {
      seen.set(key, t.id);
    }
  }

  return errors;
}

function labelOf(dfa: DFA, stateId: string): string {
  const state = dfa.states.find((s) => s.id === stateId);
  return state ? state.label : stateId;
}

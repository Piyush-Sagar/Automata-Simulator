import { EPSILON, type ENFA, type NFA } from "../types";
import {
  checkTransitionEndpoints,
  validateAlphabet,
  validateStructure,
  type ValidationError,
} from "../common/sharedChecks";

export function validateNFA(nfa: NFA | ENFA): ValidationError[] {
  const errors: ValidationError[] = [
    ...validateStructure(nfa),
    ...validateAlphabet(nfa),
    ...checkTransitionEndpoints(
      nfa,
      nfa.transitions.map((t) => ({ id: t.id, from: t.from, to: t.to })),
    ),
  ];

  const alphabet = new Set(nfa.alphabet);

  for (const t of nfa.transitions) {
    if (t.symbol === EPSILON) {
      if (nfa.type === "NFA") {
        errors.push({
          type: "epsilon-in-strict-nfa",
          message:
            "A strict NFA cannot have epsilon (ε) transitions. Change type to ε-NFA.",
          transitionId: t.id,
        });
      }
      continue;
    }
    if (!alphabet.has(t.symbol)) {
      errors.push({
        type: "symbol-not-in-alphabet",
        message: `Transition uses symbol '${t.symbol}' which is not in the alphabet {${nfa.alphabet.join(", ")}}.`,
        transitionId: t.id,
      });
    }
  }

  return errors;
}

import { validateDFA } from "../dfa/validate";
import type { AnyAutomaton } from "../types";
import {
  checkTransitionEndpoints,
  validateAlphabet,
  validateStructure,
} from "./sharedChecks";

export interface ValidationError {
  type: string;
  message: string;
  stateId?: string;
  transitionId?: string;
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "";
  return errors.map((e) => e.message).join("\n");
}

function validateGeneric(automaton: AnyAutomaton): ValidationError[] {
  return [
    ...validateStructure(automaton),
    ...validateAlphabet(automaton),
    ...checkTransitionEndpoints(
      automaton,
      automaton.transitions.map((t) => ({ id: t.id, from: t.from, to: t.to })),
    ),
  ];
}

export function validateAutomaton(automaton: AnyAutomaton): ValidationError[] {
  switch (automaton.type) {
    case "DFA":
      return validateDFA(automaton);
    case "NFA":
    case "ENFA":
      return validateGeneric(automaton);
    case "PDA":
      return validateGeneric(automaton);
    case "TM":
      return validateGeneric(automaton);
  }
}

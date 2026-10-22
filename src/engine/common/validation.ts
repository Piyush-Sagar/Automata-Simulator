import { validateDFA } from "../dfa/validate";
import { validateNFA } from "../nfa/validate";
import { validatePDA } from "../pda/validate";
import { validateTM } from "../tm/validate";
import type { AnyAutomaton } from "../types";

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

export function validateAutomaton(automaton: AnyAutomaton): ValidationError[] {
  switch (automaton.type) {
    case "DFA":
      return validateDFA(automaton);
    case "NFA":
    case "ENFA":
      return validateNFA(automaton);
    case "PDA":
      return validatePDA(automaton);
    case "TM":
      return validateTM(automaton);
  }
}

import type { BaseAutomaton } from "./automaton";
import type { EPSILON } from "./automaton";

export const INITIAL_STACK_SYMBOL = "Z";

export type PDAAcceptanceMode = "FINAL_STATE" | "EMPTY_STACK";

export interface PDATransition {
  id: string;
  from: string;
  to: string;
  inputSymbol: string | typeof EPSILON;
  stackTop: string;
  stackReplacement: string[];
}

export interface PDAConfiguration {
  state: string;
  inputIndex: number;
  stack: string[];
}

export interface PDA extends BaseAutomaton {
  readonly type: "PDA";
  transitions: PDATransition[];
  stackAlphabet: string[];
  initialStackSymbol: string;
  acceptanceMode: PDAAcceptanceMode;
}

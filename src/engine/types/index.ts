import type { DFA } from "./dfa";
import type { ENFA, NFA } from "./nfa";
import type { PDA } from "./pda";
import type { TuringMachine } from "./turingMachine";

export type AnyAutomaton = DFA | NFA | ENFA | PDA | TuringMachine;

export type {
  AutomatonType,
  BaseAutomaton,
  State,
} from "./automaton";
export { EPSILON, findState, isAccepting, startStateOf, stateLabel } from "./automaton";
export type { DFA, DFATransition } from "./dfa";
export type { ENFA, NFA, NFATransition } from "./nfa";
export {
  INITIAL_STACK_SYMBOL,
  type PDAAcceptanceMode,
  type PDA,
  type PDAConfiguration,
  type PDATransition,
} from "./pda";
export type {
  SimulationLimits,
  SimulationResult,
  SimulationStatus,
} from "./simulation";
export { DEFAULT_SIMULATION_LIMITS } from "./simulation";
export type {
  TMConfiguration,
  TMDirection,
  TMTransition,
  TuringMachine,
} from "./turingMachine";
export { TM_BLANK } from "./turingMachine";

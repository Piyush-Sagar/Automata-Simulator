import type { BaseAutomaton } from "./automaton";

export type TMDirection = "L" | "R" | "S";

export const TM_BLANK = "\u25A1";

export interface TMTransition {
  id: string;
  from: string;
  to: string;
  readSymbol: string;
  writeSymbol: string;
  direction: TMDirection;
}

export interface TMConfiguration {
  state: string;
  head: number;
  tape: Map<number, string>;
  step: number;
}

export interface TuringMachine extends BaseAutomaton {
  readonly type: "TM";
  transitions: TMTransition[];
  blankSymbol: string;
  rejectState: string | null;
}

import type { BaseAutomaton } from "./automaton";

export interface NFATransition {
  id: string;
  from: string;
  to: string;
  symbol: string;
}

export interface NFA extends BaseAutomaton {
  readonly type: "NFA";
  transitions: NFATransition[];
}

export interface ENFA extends BaseAutomaton {
  readonly type: "ENFA";
  transitions: NFATransition[];
}

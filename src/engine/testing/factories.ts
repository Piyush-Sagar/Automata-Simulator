import { INITIAL_STACK_SYMBOL, TM_BLANK } from "../types";
import type {
  DFA,
  DFATransition,
  ENFA,
  NFA,
  NFATransition,
  PDA,
  PDAAcceptanceMode,
  PDATransition,
  State,
  TMTransition,
  TuringMachine,
} from "../types";

let nextId = 0;

export function makeState(
  overrides: Partial<State> & Pick<State, "id">,
): State {
  return {
    label: overrides.id,
    x: 0,
    y: 0,
    isStart: false,
    isAccept: false,
    ...overrides,
  };
}

function freshId(prefix: string): string {
  nextId += 1;
  return `${prefix}${nextId}`;
}

interface BaseSpec {
  states: Array<Partial<State> & Pick<State, "id">>;
  alphabet: string[];
  startState?: string | null;
  acceptStates?: string[];
  name?: string;
}

function makeBase(spec: BaseSpec): Omit<DFA, "type" | "transitions"> {
  return {
    id: spec.name ?? "fixture",
    name: spec.name ?? "Fixture",
    states: spec.states.map((s) => makeState(s)),
    alphabet: spec.alphabet,
    startState:
      spec.startState !== undefined
        ? spec.startState
        : (spec.states[0]?.id ?? null),
    acceptStates: spec.acceptStates ?? [],
  };
}

export function makeDFA(spec: {
  states: Array<Partial<State> & Pick<State, "id">>;
  alphabet: string[];
  startState?: string | null;
  acceptStates?: string[];
  name?: string;
  transitions?: Array<Omit<DFATransition, "id">>;
}): DFA {
  return {
    ...makeBase(spec),
    type: "DFA",
    transitions: (spec.transitions ?? []).map((t) => ({
      ...t,
      id: freshId("t"),
    })),
  };
}

export function makeNFA(spec: {
  states: Array<Partial<State> & Pick<State, "id">>;
  alphabet: string[];
  startState?: string | null;
  acceptStates?: string[];
  name?: string;
  transitions?: Array<Omit<NFATransition, "id">>;
}): NFA {
  return {
    ...makeBase(spec),
    type: "NFA",
    transitions: (spec.transitions ?? []).map((t) => ({
      ...t,
      id: freshId("t"),
    })),
  };
}

export function makeENFA(spec: {
  states: Array<Partial<State> & Pick<State, "id">>;
  alphabet: string[];
  startState?: string | null;
  acceptStates?: string[];
  name?: string;
  transitions?: Array<Omit<NFATransition, "id">>;
}): ENFA {
  return {
    ...makeBase(spec),
    type: "ENFA",
    transitions: (spec.transitions ?? []).map((t) => ({
      ...t,
      id: freshId("t"),
    })),
  };
}

export function makePDA(spec: {
  states: Array<Partial<State> & Pick<State, "id">>;
  alphabet: string[];
  startState?: string | null;
  acceptStates?: string[];
  name?: string;
  transitions?: Array<Omit<PDATransition, "id">>;
  stackAlphabet?: string[];
  initialStackSymbol?: string;
  acceptanceMode?: PDAAcceptanceMode;
}): PDA {
  return {
    ...makeBase(spec),
    type: "PDA",
    transitions: (spec.transitions ?? []).map((t) => ({
      ...t,
      id: freshId("t"),
    })),
    stackAlphabet: spec.stackAlphabet ?? ["A", "B"],
    initialStackSymbol: spec.initialStackSymbol ?? INITIAL_STACK_SYMBOL,
    acceptanceMode: spec.acceptanceMode ?? "FINAL_STATE",
  };
}

export function makeTM(spec: {
  states: Array<Partial<State> & Pick<State, "id">>;
  alphabet: string[];
  startState?: string | null;
  acceptStates?: string[];
  name?: string;
  transitions?: Array<Omit<TMTransition, "id">>;
  blankSymbol?: string;
  rejectState?: string | null;
}): TuringMachine {
  return {
    ...makeBase(spec),
    type: "TM",
    transitions: (spec.transitions ?? []).map((t) => ({
      ...t,
      id: freshId("t"),
    })),
    blankSymbol: spec.blankSymbol ?? TM_BLANK,
    rejectState: spec.rejectState ?? null,
  };
}

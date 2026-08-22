import { create } from "zustand";
import type { AnyAutomaton, AutomatonType, DFA, DFATransition, State } from "../engine/types";
import { validateDFA } from "../engine/dfa/validate";
import { validateNFA } from "../engine/nfa/validate";

type AutomataState = {
  automaton: AnyAutomaton;
  setAutomaton: (automaton: AnyAutomaton) => void;
  setAutomatonType: (type: AutomatonType) => void;

  addState: (x: number, y: number) => void;
  updateState: (id: string, data: Partial<State>) => void;
  removeState: (id: string) => void;

  addTransition: (from: string, to: string) => void;
  updateTransition: (id: string, data: Partial<DFATransition>) => void;
  removeTransition: (id: string) => void;

  setStartState: (id: string | null) => void;
  toggleAcceptState: (id: string) => void;

  validate: () => ReturnType<typeof validateDFA>;
};

const createEmptyDFA = (): DFA => ({
  id: crypto.randomUUID(),
  name: "New DFA",
  type: "DFA",
  states: [],
  alphabet: ["0", "1"],
  startState: null,
  acceptStates: [],
  transitions: [],
});

const getNextStateLabel = (states: State[]) => {
  let i = 0;
  while (states.some((s) => s.label === `q${i}`)) {
    i++;
  }
  return `q${i}`;
};

export const useAutomataStore = create<AutomataState>((set, get) => ({
  automaton: createEmptyDFA(),

  setAutomaton: (automaton) => set({ automaton }),

  setAutomatonType: (type) =>
    set((state) => ({
      automaton: { ...state.automaton, type } as AnyAutomaton,
    })),

  addState: (x, y) =>
    set((state) => {
      const newState: State = {
        id: crypto.randomUUID(),
        label: getNextStateLabel(state.automaton.states),
        x,
        y,
        isStart: false,
        isAccept: false,
      };
      return {
        automaton: {
          ...state.automaton,
          states: [...state.automaton.states, newState],
        },
      };
    }),

  updateState: (id, data) =>
    set((state) => ({
      automaton: {
        ...state.automaton,
        states: state.automaton.states.map((s) =>
          s.id === id ? { ...s, ...data } : s,
        ),
      },
    })),

  removeState: (id) =>
    set((state) => {
      const a = state.automaton;
      const states = a.states.filter((s) => s.id !== id);
      const startState = a.startState === id ? null : a.startState;
      const acceptStates = a.acceptStates.filter((sId) => sId !== id);

      let transitions = "transitions" in a ? a.transitions : [];
      if ("transitions" in a) {
        transitions = (a.transitions as any[]).filter(
          (t) => t.from !== id && t.to !== id,
        );
      }

      return {
        automaton: {
          ...a,
          states,
          startState,
          acceptStates,
          transitions,
        } as AnyAutomaton,
      };
    }),

  addTransition: (from, to) =>
    set((state) => {
      const a = state.automaton;
      if (a.type !== "DFA" && a.type !== "NFA" && a.type !== "ENFA") return state;
      const newTransition = {
        id: crypto.randomUUID(),
        from,
        to,
        symbol: "0", // Default symbol
      };
      return {
        automaton: {
          ...a,
          transitions: [...a.transitions, newTransition],
        } as AnyAutomaton,
      };
    }),

  updateTransition: (id, data) =>
    set((state) => {
      const a = state.automaton;
      if (a.type !== "DFA" && a.type !== "NFA" && a.type !== "ENFA") return state;
      return {
        automaton: {
          ...a,
          transitions: a.transitions.map((t: any) =>
            t.id === id ? { ...t, ...data } : t,
          ),
        } as AnyAutomaton,
      };
    }),

  removeTransition: (id) =>
    set((state) => {
      const a = state.automaton;
      if (a.type !== "DFA" && a.type !== "NFA" && a.type !== "ENFA") return state;
      return {
        automaton: {
          ...a,
          transitions: a.transitions.filter((t: any) => t.id !== id),
        } as AnyAutomaton,
      };
    }),

  setStartState: (id) =>
    set((state) => {
      const a = state.automaton;
      return {
        automaton: {
          ...a,
          startState: id,
          states: a.states.map((s) => ({
            ...s,
            isStart: s.id === id,
          })),
        },
      };
    }),

  toggleAcceptState: (id) =>
    set((state) => {
      const a = state.automaton;
      const isAccepting = a.acceptStates.includes(id);
      const newAcceptStates = isAccepting
        ? a.acceptStates.filter((sId) => sId !== id)
        : [...a.acceptStates, id];

      return {
        automaton: {
          ...a,
          acceptStates: newAcceptStates,
          states: a.states.map((s) =>
            s.id === id ? { ...s, isAccept: !isAccepting } : s,
          ),
        },
      };
    }),

  validate: () => {
    const { automaton } = get();
    if (automaton.type === "DFA") {
      return validateDFA(automaton);
    } else if (automaton.type === "NFA" || automaton.type === "ENFA") {
      return validateNFA(automaton);
    }
    return []; // Phase 1 fallback
  },
}));

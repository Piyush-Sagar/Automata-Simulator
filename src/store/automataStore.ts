import { create } from "zustand";
import type { AnyAutomaton, AutomatonType, State } from "../engine/types";
import { emptyMachine } from "../engine/templates";
import { createId } from "../engine/common/utilities";
import { validateAutomaton } from "../engine/common/validation";
import { useSimulationStore } from "./simulationStore";

export type Transition = AnyAutomaton["transitions"][number];
type AutomataState = {
  automaton: AnyAutomaton;
  past: AnyAutomaton[];
  future: AnyAutomaton[];
  transaction: AnyAutomaton | null;
  selectedNodes: string[];
  selectedEdges: string[];
  select: (nodes: string[], edges: string[]) => void;
  setAutomaton: (a: AnyAutomaton) => void;
  setAutomatonType: (type: AutomatonType) => void;
  updateMachine: (a: AnyAutomaton) => void;
  addState: (x: number, y: number) => void;
  updateState: (id: string, data: Partial<State>) => void;
  removeState: (id: string) => void;
  addTransition: (from: string, to: string) => void;
  putTransition: (t: Transition) => void;
  updateTransition: (id: string, data: Partial<Transition>) => void;
  removeTransition: (id: string) => void;
  setStartState: (id: string | null) => void;
  toggleAcceptState: (id: string) => void;
  deleteSelected: () => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  undo: () => void;
  redo: () => void;
  validate: () => ReturnType<typeof validateAutomaton>;
};

export const useAutomataStore = create<AutomataState>((set, get) => {
  const commit = (automaton: AnyAutomaton) => {
    const s = get();
    useSimulationStore.getState().setSimulationResult(null);
    set({
      automaton,
      past: s.transaction ? s.past : [...s.past.slice(-99), s.automaton],
      future: [],
    });
  };
  const remove = (nodes: string[], edges: string[]) => {
    const a = get().automaton;
    commit({
      ...a,
      ...(a.type === "TM" && nodes.includes(a.rejectState ?? "")
        ? { rejectState: null }
        : {}),
      states: a.states.filter((s) => !nodes.includes(s.id)),
      startState: nodes.includes(a.startState ?? "") ? null : a.startState,
      acceptStates: a.acceptStates.filter((id) => !nodes.includes(id)),
      transitions: a.transitions.filter(
        (t) =>
          !nodes.includes(t.from) &&
          !nodes.includes(t.to) &&
          !edges.includes(t.id),
      ),
    } as AnyAutomaton);
    set({ selectedNodes: [], selectedEdges: [] });
  };
  return {
    automaton: emptyMachine(),
    past: [],
    future: [],
    transaction: null,
    selectedNodes: [],
    selectedEdges: [],
    select: (selectedNodes, selectedEdges) =>
      set({ selectedNodes, selectedEdges }),
    setAutomaton: (a) => {
      commit(a);
      set({ selectedNodes: [], selectedEdges: [] });
    },
    updateMachine: commit,
    setAutomatonType: (type) => {
      const a = get().automaton;
      if (type === a.type) return;
      if (
        ["DFA", "NFA", "ENFA"].includes(type) &&
        ["DFA", "NFA", "ENFA"].includes(a.type)
      )
        commit({ ...a, type } as AnyAutomaton);
      else commit(emptyMachine(type));
      set({ selectedNodes: [], selectedEdges: [] });
    },
    addState: (x, y) => {
      const a = get().automaton;
      let i = 0;
      while (a.states.some((s) => s.label === `q${i}`)) i++;
      while (a.states.some((s) => Math.hypot(s.x - x, s.y - y) < 100)) {
        x += 120;
        y += 35;
      }
      const id = createId("state"),
        first = !a.states.length;
      commit({
        ...a,
        startState: first ? id : a.startState,
        states: [
          ...a.states,
          { id, label: `q${i}`, x, y, isStart: first, isAccept: false },
        ],
      });
      set({ selectedNodes: [id], selectedEdges: [] });
    },
    updateState: (id, data) => {
      const a = get().automaton;
      commit({
        ...a,
        states: a.states.map((s) =>
          s.id === id
            ? {
                ...s,
                ...data,
                id: s.id,
                isStart: s.isStart,
                isAccept: s.isAccept,
              }
            : s,
        ),
      });
    },
    removeState: (id) => remove([id], []),
    addTransition: (from, to) => {
      const a = get().automaton;
      const base = { id: createId("transition"), from, to };
      const t: Transition =
        a.type === "PDA"
          ? {
              ...base,
              inputSymbol: a.alphabet[0] ?? "ε",
              stackTop: a.initialStackSymbol,
              stackReplacement: [],
            }
          : a.type === "TM"
            ? {
                ...base,
                readSymbol: a.blankSymbol,
                writeSymbol: a.blankSymbol,
                direction: "S",
              }
            : { ...base, symbol: a.alphabet[0] ?? "ε" };
      get().putTransition(t);
    },
    putTransition: (t) => {
      const a = get().automaton;
      if (
        (a.type === "PDA" && !("stackTop" in t)) ||
        (a.type === "TM" && !("readSymbol" in t)) ||
        (!["PDA", "TM"].includes(a.type) && !("symbol" in t))
      )
        return;
      commit({
        ...a,
        transitions: [...a.transitions.filter((e) => e.id !== t.id), t],
      } as AnyAutomaton);
    },
    updateTransition: (id, data) => {
      const t = get().automaton.transitions.find((t) => t.id === id);
      if (t) get().putTransition({ ...t, ...data } as Transition);
    },
    removeTransition: (id) => remove([], [id]),
    setStartState: (id) => {
      const a = get().automaton;
      commit({
        ...a,
        startState: id,
        states: a.states.map((s) => ({ ...s, isStart: s.id === id })),
      });
    },
    toggleAcceptState: (id) => {
      const a = get().automaton;
      const acceptStates = a.acceptStates.includes(id)
        ? a.acceptStates.filter((s) => s !== id)
        : [...a.acceptStates, id];
      commit({
        ...a,
        acceptStates,
        states: a.states.map((s) => ({
          ...s,
          isAccept: acceptStates.includes(s.id),
        })),
      });
    },
    deleteSelected: () => remove(get().selectedNodes, get().selectedEdges),
    beginTransaction: () => set({ transaction: get().automaton }),
    endTransaction: () => {
      const s = get();
      if (s.transaction && s.transaction !== s.automaton)
        set({ past: [...s.past.slice(-99), s.transaction], future: [] });
      set({ transaction: null });
    },
    undo: () => {
      const s = get();
      if (!s.past.length) return;
      useSimulationStore.getState().setSimulationResult(null);
      set({
        automaton: s.past.at(-1)!,
        past: s.past.slice(0, -1),
        future: [s.automaton, ...s.future],
        selectedNodes: [],
        selectedEdges: [],
      });
    },
    redo: () => {
      const s = get();
      if (!s.future.length) return;
      useSimulationStore.getState().setSimulationResult(null);
      set({
        automaton: s.future[0],
        past: [...s.past, s.automaton],
        future: s.future.slice(1),
        selectedNodes: [],
        selectedEdges: [],
      });
    },
    validate: () => validateAutomaton(get().automaton),
  };
});

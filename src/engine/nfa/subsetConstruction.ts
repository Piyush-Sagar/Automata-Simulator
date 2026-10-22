import {
  EPSILON,
  type DFA,
  type DFATransition,
  type ENFA,
  type NFA,
  type State,
  startStateOf,
} from "../types";
import { createEpsilonClosure } from "./epsilonClosure";
import { validateNFA } from "./validate";
import { createId } from "../common/utilities";

export interface SubsetConstructionTrace {
  mapping: Map<string, string[]>; // DFA state ID -> Original NFA state IDs
}

export function subsetConstruction(
  nfa: NFA | ENFA,
): { dfa: DFA; trace: SubsetConstructionTrace } | { error: string } {
  const errors = validateNFA(nfa);
  if (errors.length) return { error: errors.map((e) => e.message).join("\n") };
  const start = startStateOf(nfa);
  if (!start) {
    return { error: "NFA has no start state." };
  }

  const alphabet = nfa.alphabet.filter((sym) => sym !== EPSILON);
  const closure = createEpsilonClosure(nfa);
  const table = new Map<string, string[]>();
  for (const t of nfa.transitions) {
    const key = JSON.stringify([t.from, t.symbol]);
    const targets = table.get(key) ?? [];
    targets.push(t.to);
    table.set(key, targets);
  }

  const dfaStates: State[] = [];
  const dfaTransitions: DFATransition[] = [];
  const dfaAcceptStates: string[] = [];

  const stateSets = new Map<string, string[]>(); // Canonical set string -> original NFA state IDs array
  const stateMap = new Map<string, string>(); // Canonical set string -> DFA state ID
  const queue: string[][] = [];

  let stateCounter = 0;

  function getCanonicalKey(states: string[] | Set<string>): string {
    return JSON.stringify(Array.from(states).sort());
  }

  function addSubsetState(states: string[] | Set<string>): string {
    const key = getCanonicalKey(states);
    if (stateMap.has(key)) {
      return stateMap.get(key)!;
    }

    const stateId = `D${stateCounter++}`;
    const stateArray = Array.from(states).sort();

    stateSets.set(key, stateArray);
    stateMap.set(key, stateId);

    const isAccept = stateArray.some((s) => nfa.acceptStates.includes(s));
    if (isAccept) {
      dfaAcceptStates.push(stateId);
    }

    // Rough positioning for the new DFA states
    dfaStates.push({
      id: stateId,
      label: stateId,
      x: 100 + (stateCounter % 5) * 150,
      y: 100 + Math.floor(stateCounter / 5) * 100,
      isStart: stateCounter === 1,
      isAccept,
    });

    queue.push(stateArray);
    return stateId;
  }

  const initialClosure = closure([start.id]);
  const dfaStartStateId = addSubsetState(initialClosure);

  while (queue.length > 0) {
    if (dfaStates.length > 512 || dfaTransitions.length > 10000)
      return {
        error:
          "Subset construction exceeds the 512-state / 10000-transition budget.",
      };
    const currentSubset = queue.shift()!;
    const currentCanonical = getCanonicalKey(currentSubset);
    const fromDfaId = stateMap.get(currentCanonical)!;

    for (const symbol of alphabet) {
      const nextStatesSet = new Set<string>();

      for (const state of currentSubset) {
        for (const to of table.get(JSON.stringify([state, symbol])) ?? [])
          nextStatesSet.add(to);
      }

      const closedNextStates = closure(nextStatesSet);
      {
        const toDfaId = addSubsetState(closedNextStates);
        dfaTransitions.push({
          id: createId("subset-edge"),
          from: fromDfaId,
          to: toDfaId,
          symbol,
        });
      }
    }
  }

  const mapping = new Map<string, string[]>();
  for (const [key, dfaId] of stateMap.entries()) {
    mapping.set(dfaId, stateSets.get(key)!);
  }

  return {
    dfa: {
      id: createId("subset"),
      name: `DFA (from ${nfa.name})`,
      type: "DFA",
      states: dfaStates,
      alphabet,
      startState: dfaStartStateId,
      acceptStates: dfaAcceptStates,
      transitions: dfaTransitions,
    },
    trace: { mapping },
  };
}

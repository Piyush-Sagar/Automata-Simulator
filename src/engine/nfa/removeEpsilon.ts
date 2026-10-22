import type { ENFA, NFA, NFATransition } from "../types";
import { createEpsilonClosure } from "./epsilonClosure";
import { validateNFA } from "./validate";
import { createId } from "../common/utilities";

export function removeEpsilon(a: ENFA): NFA {
  const errors = validateNFA(a);
  if (errors.length) throw new Error(errors.map((e) => e.message).join("\n"));
  const transitions: NFATransition[] = [];
  const close = createEpsilonClosure(a);
  const table = new Map<string, string[]>();
  for (const t of a.transitions) {
    const key = JSON.stringify([t.from, t.symbol]);
    const targets = table.get(key) ?? [];
    targets.push(t.to);
    table.set(key, targets);
  }
  const acceptStates: string[] = [];
  for (const state of a.states) {
    const closure = close([state.id]);
    if ([...closure].some((s) => a.acceptStates.includes(s)))
      acceptStates.push(state.id);
    for (const symbol of a.alphabet) {
      const targets = [...closure].flatMap(
        (id) => table.get(JSON.stringify([id, symbol])) ?? [],
      );
      for (const to of close(targets)) {
        if (transitions.length >= 10000)
          throw new Error(
            "Epsilon removal exceeds the 10000-transition budget.",
          );
        transitions.push({
          id: createId("epsilon-free"),
          from: state.id,
          to,
          symbol,
        });
      }
    }
  }
  return {
    ...a,
    id: createId("nfa"),
    name: `NFA from ${a.name}`,
    type: "NFA",
    acceptStates,
    states: a.states.map((s) => ({
      ...s,
      isAccept: acceptStates.includes(s.id),
    })),
    transitions,
  };
}

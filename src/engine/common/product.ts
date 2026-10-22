import type { DFA, NFA, ENFA, State, DFATransition } from "../types";
import { subsetConstruction } from "../nfa/subsetConstruction";
import { validateDFA } from "../dfa/validate";
import { createId } from "./utilities";

type Finite = DFA | NFA | ENFA;
export function productIntersection(left: Finite, right: Finite): DFA {
  function deterministic(a: Finite): DFA {
    if (a.type === "DFA") {
      const errors = validateDFA(a);
      if (errors.length)
        throw new Error(errors.map((e) => e.message).join("\n"));
      return a;
    }
    const result = subsetConstruction(a);
    if ("error" in result) throw new Error(result.error);
    return result.dfa;
  }
  const a = deterministic(left),
    b = deterministic(right);
  const alphabet = [...new Set([...a.alphabet, ...b.alphabet])];
  const states: State[] = [],
    transitions: DFATransition[] = [],
    acceptStates: string[] = [];
  const ids = new Map<string, string>();
  const queue: [string | null, string | null][] = [];
  function add(x: string | null, y: string | null): string {
    const key = JSON.stringify([x, y]);
    const found = ids.get(key);
    if (found) return found;
    if (states.length >= 512)
      throw new Error("Product exceeds the 512-state budget.");
    const id = `P${states.length}`;
    ids.set(key, id);
    queue.push([x, y]);
    const isAccept =
      x !== null &&
      y !== null &&
      a.acceptStates.includes(x) &&
      b.acceptStates.includes(y);
    if (isAccept) acceptStates.push(id);
    states.push({
      id,
      label: JSON.stringify([
        x === null ? null : a.states.find((s) => s.id === x)?.label,
        y === null ? null : b.states.find((s) => s.id === y)?.label,
      ]),
      x: 100 + (states.length % 5) * 170,
      y: 100 + Math.floor(states.length / 5) * 130,
      isStart: states.length === 0,
      isAccept,
    });
    return id;
  }
  const startState = add(a.startState, b.startState);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i],
      from = ids.get(JSON.stringify([x, y]))!;
    for (const symbol of alphabet) {
      if (transitions.length >= 10000)
        throw new Error("Product exceeds the 10000-transition budget.");
      const to = add(
        a.transitions.find((t) => t.from === x && t.symbol === symbol)?.to ??
          null,
        b.transitions.find((t) => t.from === y && t.symbol === symbol)?.to ??
          null,
      );
      transitions.push({ id: createId("product-edge"), from, to, symbol });
    }
  }
  return {
    id: createId("product"),
    name: `${left.name} ∩ ${right.name}`,
    type: "DFA",
    states,
    transitions,
    alphabet,
    startState,
    acceptStates,
  };
}

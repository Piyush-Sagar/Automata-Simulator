import { EPSILON, type ENFA, type NFA } from "../types";

/**
 * Computes the epsilon closure of a single state or a set of states.
 * The epsilon closure of a state q is the set of all states reachable from q
 * following only epsilon transitions, including q itself.
 */
export function epsilonClosure(
  automaton: NFA | ENFA,
  states: Set<string> | string[],
): Set<string> {
  return createEpsilonClosure(automaton)(states);
}

/** Compile adjacency once for repeated closure queries within an algorithm. */
export function createEpsilonClosure(automaton: NFA | ENFA) {
  const adjacency = new Map<string, string[]>();
  for (const t of automaton.transitions)
    if (t.symbol === EPSILON) {
      const targets = adjacency.get(t.from) ?? [];
      targets.push(t.to);
      adjacency.set(t.from, targets);
    }
  return (states: Set<string> | string[]): Set<string> => {
    const initialStates = Array.isArray(states) ? states : Array.from(states);
    const closure = new Set<string>(initialStates);
    const stack = [...initialStates];

    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const to of adjacency.get(current) ?? []) {
        if (!closure.has(to)) {
          closure.add(to);
          stack.push(to);
        }
      }
    }

    return closure;
  };
}

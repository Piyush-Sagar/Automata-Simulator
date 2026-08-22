import { EPSILON, type ENFA, type NFA, type NFATransition } from "../types";

/**
 * Computes the epsilon closure of a single state or a set of states.
 * The epsilon closure of a state q is the set of all states reachable from q
 * following only epsilon transitions, including q itself.
 */
export function epsilonClosure(
  automaton: NFA | ENFA,
  states: Set<string> | string[],
): Set<string> {
  const initialStates = Array.isArray(states) ? states : Array.from(states);
  const closure = new Set<string>(initialStates);
  const stack = [...initialStates];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const epsilonTransitions = automaton.transitions.filter(
      (t) => t.from === current && t.symbol === EPSILON,
    );

    for (const t of epsilonTransitions) {
      if (!closure.has(t.to)) {
        closure.add(t.to);
        stack.push(t.to);
      }
    }
  }

  return closure;
}

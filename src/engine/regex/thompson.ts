import type { ENFA, State, NFATransition } from "../types";
import { createId } from "../common/utilities";
import { parseRegex, type RegexAST } from "./parser";

export function thompson(ast: RegexAST, name = "Regex machine"): ENFA {
  const states: State[] = [],
    transitions: NFATransition[] = [],
    alphabet = new Set<string>();
  function state() {
    if (states.length >= 512)
      throw new Error("Regex construction exceeds the 512-state budget.");
    const id = `r${states.length}`;
    states.push({
      id,
      label: id,
      x: 100 + (states.length % 8) * 130,
      y: 100 + Math.floor(states.length / 8) * 120,
      isStart: false,
      isAccept: false,
    });
    return id;
  }
  const edge = (from: string, to: string, symbol = "ε") =>
    transitions.push({ id: createId("re"), from, to, symbol });
  function build(node: RegexAST): [string, string] {
    const start = state(),
      end = state();
    if (node.kind === "literal") {
      alphabet.add(node.value);
      edge(start, end, node.value);
    } else if (node.kind === "epsilon") edge(start, end);
    else if (node.kind === "star") {
      const [s, e] = build(node.child);
      edge(start, end);
      edge(start, s);
      edge(e, s);
      edge(e, end);
    } else if (node.kind === "union" || node.kind === "concat") {
      const [s1, e1] = build(node.left),
        [s2, e2] = build(node.right);
      edge(start, s1);
      if (node.kind === "union") {
        edge(start, s2);
        edge(e1, end);
      } else edge(e1, s2);
      edge(e2, end);
    }
    return [start, end];
  }
  const [startState, accept] = build(ast);
  return {
    id: createId("regex"),
    name,
    type: "ENFA",
    states: states.map((s) => ({
      ...s,
      isStart: s.id === startState,
      isAccept: s.id === accept,
    })),
    startState,
    acceptStates: [accept],
    alphabet: [...alphabet],
    transitions,
  };
}

export function regexToENFA(source: string): ENFA {
  return thompson(parseRegex(source), `Regex: ${source || "ε"}`);
}

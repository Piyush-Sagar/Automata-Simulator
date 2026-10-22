import type { AnyAutomaton, AutomatonType, State } from "./types";
import { createId } from "./common/utilities";
import { regexToENFA } from "./regex/thompson";

export function emptyMachine(type: AutomatonType = "DFA"): AnyAutomaton {
  const base = {
    id: createId("machine"),
    name: `Untitled ${type}`,
    states: [],
    alphabet: ["0", "1"],
    startState: null,
    acceptStates: [],
  };
  if (type === "PDA")
    return {
      ...base,
      type,
      transitions: [],
      stackAlphabet: ["Z", "A"],
      initialStackSymbol: "Z",
      acceptanceMode: "FINAL_STATE",
    };
  if (type === "TM")
    return {
      ...base,
      type,
      transitions: [],
      blankSymbol: "□",
      rejectState: null,
    };
  return { ...base, type, transitions: [] };
}
function states(labels: string[], accepts: string[]): State[] {
  return labels.map((id, i) => ({
    id,
    label: id,
    x: 100 + i * 190,
    y: i % 2 ? 220 : 100,
    isStart: i === 0,
    isAccept: accepts.includes(id),
  }));
}
export const templateInfo = [
  {
    id: "ending",
    name: "Ends in 01",
    type: "DFA",
    description: "A deterministic machine for binary strings ending in 01.",
    sample: "1101",
  },
  {
    id: "contains",
    name: "Contains 101",
    type: "DFA",
    description: "Recognize a substring using a four-state DFA.",
    sample: "11010",
  },
  {
    id: "nfa",
    name: "Guess the ending",
    type: "NFA",
    description: "Nondeterministically guess where the final 01 begins.",
    sample: "1001",
  },
  {
    id: "epsilon",
    name: "Union with ε",
    type: "ENFA",
    description: "Explore ε-closure in the language 0* ∪ 1*.",
    sample: "111",
  },
  {
    id: "pda",
    name: "Equal zeros and ones",
    type: "PDA",
    description: "Use a stack to recognize 0ⁿ1ⁿ, including empty input.",
    sample: "0011",
  },
  {
    id: "tm",
    name: "Flip the bits",
    type: "TM",
    description: "A Turing machine replaces every 0 with 1 and every 1 with 0.",
    sample: "10110",
  },
];
export function loadTemplate(id: string): AnyAutomaton {
  const base = {
    id: createId("template"),
    alphabet: ["0", "1"],
    startState: "q0",
  };
  const edge = (from: string, to: string, symbol: string) => ({
    id: createId("t"),
    from,
    to,
    symbol,
  });
  if (id === "epsilon") return { ...regexToENFA("0*|1*"), name: "0* ∪ 1*" };
  if (id === "pda") {
    const t = (
      from: string,
      to: string,
      inputSymbol: string,
      stackTop: string,
      stackReplacement: string[],
    ) => ({
      id: createId("pda-t"),
      from,
      to,
      inputSymbol,
      stackTop,
      stackReplacement,
    });
    return {
      ...base,
      type: "PDA",
      name: "Equal zeros and ones",
      states: states(["q0", "q1", "q2"], ["q2"]),
      acceptStates: ["q2"],
      stackAlphabet: ["Z", "A"],
      initialStackSymbol: "Z",
      acceptanceMode: "FINAL_STATE",
      transitions: [
        t("q0", "q0", "0", "Z", ["Z", "A"]),
        t("q0", "q0", "0", "A", ["A", "A"]),
        t("q0", "q1", "1", "A", []),
        t("q1", "q1", "1", "A", []),
        t("q1", "q2", "ε", "Z", []),
        t("q0", "q2", "ε", "Z", []),
      ],
    };
  }
  if (id === "tm")
    return {
      ...base,
      type: "TM",
      name: "Flip the bits",
      states: states(["q0", "halt"], ["halt"]),
      acceptStates: ["halt"],
      blankSymbol: "□",
      rejectState: null,
      transitions: [
        {
          id: createId("tm-t"),
          from: "q0",
          to: "q0",
          readSymbol: "0",
          writeSymbol: "1",
          direction: "R",
        },
        {
          id: createId("tm-t"),
          from: "q0",
          to: "q0",
          readSymbol: "1",
          writeSymbol: "0",
          direction: "R",
        },
        {
          id: createId("tm-t"),
          from: "q0",
          to: "halt",
          readSymbol: "□",
          writeSymbol: "□",
          direction: "S",
        },
      ],
    };
  if (id === "contains")
    return {
      ...base,
      type: "DFA",
      name: "Contains 101",
      states: states(["q0", "q1", "q2", "q3"], ["q3"]),
      acceptStates: ["q3"],
      transitions: [
        edge("q0", "q0", "0"),
        edge("q0", "q1", "1"),
        edge("q1", "q2", "0"),
        edge("q1", "q1", "1"),
        edge("q2", "q0", "0"),
        edge("q2", "q3", "1"),
        edge("q3", "q3", "0"),
        edge("q3", "q3", "1"),
      ],
    };
  if (id === "nfa")
    return {
      ...base,
      type: "NFA",
      name: "Guess the ending",
      states: states(["q0", "q1", "q2"], ["q2"]),
      acceptStates: ["q2"],
      transitions: [
        edge("q0", "q0", "0"),
        edge("q0", "q0", "1"),
        edge("q0", "q1", "0"),
        edge("q1", "q2", "1"),
      ],
    };
  return {
    ...base,
    type: "DFA",
    name: "Ends in 01",
    states: states(["q0", "q1", "q2"], ["q2"]),
    acceptStates: ["q2"],
    transitions: [
      edge("q0", "q1", "0"),
      edge("q0", "q0", "1"),
      edge("q1", "q1", "0"),
      edge("q1", "q2", "1"),
      edge("q2", "q1", "0"),
      edge("q2", "q0", "1"),
    ],
  };
}

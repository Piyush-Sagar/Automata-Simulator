import { describe, it, expect } from "vitest";
import { minimizeDFA } from "./minimize";
import type { DFA } from "../types";

describe("minimizeDFA", () => {
  it("should merge equivalent states", () => {
    // Redundant DFA that accepts strings ending in '0'
    const dfa: DFA = {
      id: "1",
      name: "Redundant",
      type: "DFA",
      states: [
        { id: "q0", label: "q0", x: 0, y: 0, isStart: true, isAccept: false },
        { id: "q1", label: "q1", x: 0, y: 0, isStart: false, isAccept: true }, // Accept
        { id: "q2", label: "q2", x: 0, y: 0, isStart: false, isAccept: false }, // Equivalent to q0
        { id: "q3", label: "q3", x: 0, y: 0, isStart: false, isAccept: true }, // Equivalent to q1
      ],
      alphabet: ["0", "1"],
      startState: "q0",
      acceptStates: ["q1", "q3"],
      transitions: [
        { id: "t1", from: "q0", to: "q1", symbol: "0" },
        { id: "t2", from: "q0", to: "q2", symbol: "1" },
        { id: "t3", from: "q1", to: "q3", symbol: "0" },
        { id: "t4", from: "q1", to: "q0", symbol: "1" },
        { id: "t5", from: "q2", to: "q1", symbol: "0" },
        { id: "t6", from: "q2", to: "q2", symbol: "1" },
        { id: "t7", from: "q3", to: "q3", symbol: "0" },
        { id: "t8", from: "q3", to: "q0", symbol: "1" },
      ],
    };

    const result = minimizeDFA(dfa);
    expect("error" in result).toBe(false);

    if (!("error" in result)) {
      const { dfa: minDFA, trace } = result;
      // It should merge {q0, q2} and {q1, q3} resulting in 2 states
      expect(minDFA.states.length).toBe(2);

      const p1 = trace.mapping.get(minDFA.states[0].id)?.sort();
      const p2 = trace.mapping.get(minDFA.states[1].id)?.sort();

      const partitions = [p1, p2].sort((a, b) => a![0].localeCompare(b![0]));
      expect(partitions).toEqual([
        ["q0", "q2"],
        ["q1", "q3"],
      ]);
    }
  });
});

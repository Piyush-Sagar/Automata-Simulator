import { describe, it, expect } from "vitest";
import { subsetConstruction } from "../subsetConstruction";
import { type NFA } from "../../types";

describe("subsetConstruction", () => {
  it("should convert a basic NFA to a DFA correctly", () => {
    // NFA that accepts strings ending in '1'
    const nfa: NFA = {
      id: "1",
      name: "Ends with 1",
      type: "NFA",
      states: [
        { id: "q0", label: "q0", x: 0, y: 0, isStart: true, isAccept: false },
        { id: "q1", label: "q1", x: 0, y: 0, isStart: false, isAccept: true },
      ],
      alphabet: ["0", "1"],
      startState: "q0",
      acceptStates: ["q1"],
      transitions: [
        { id: "t1", from: "q0", to: "q0", symbol: "0" },
        { id: "t2", from: "q0", to: "q0", symbol: "1" },
        { id: "t3", from: "q0", to: "q1", symbol: "1" },
      ],
    };

    const result = subsetConstruction(nfa);
    expect("error" in result).toBe(false);

    if (!("error" in result)) {
      const { dfa, trace } = result;
      // Should have 2 states: {q0} and {q0, q1}
      expect(dfa.states.length).toBe(2);

      // The start state should map to {q0}
      expect(trace.mapping.get(dfa.startState!)?.sort()).toEqual(["q0"]);

      // There should be exactly one accepting state, mapping to {q0, q1}
      expect(dfa.acceptStates.length).toBe(1);
      expect(trace.mapping.get(dfa.acceptStates[0])?.sort()).toEqual([
        "q0",
        "q1",
      ]);

      // Check transitions
      expect(dfa.transitions.length).toBe(4); // 2 states * 2 symbols
    }
  });
});

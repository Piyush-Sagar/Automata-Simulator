import { describe, expect, it } from "vitest";
import { validateDFA } from "./validate";
import { makeDFA } from "../testing/factories";

const valid = () =>
  makeDFA({
    states: [
      { id: "q0", isStart: true },
      { id: "q1", isAccept: true },
    ],
    alphabet: ["0", "1"],
    acceptStates: ["q1"],
    transitions: [
      { from: "q0", to: "q0", symbol: "1" },
      { from: "q0", to: "q1", symbol: "0" },
      { from: "q1", to: "q1", symbol: "0" },
      { from: "q1", to: "q0", symbol: "1" },
    ],
  });

describe("validateDFA", () => {
  it("accepts a well-formed DFA with no errors", () => {
    expect(validateDFA(valid())).toEqual([]);
  });

  it("flags two transitions for the same state and symbol", () => {
    const dfa = makeDFA({
      states: [{ id: "q0", isStart: true }, { id: "q1" }, { id: "q2" }],
      alphabet: ["0", "1"],
      transitions: [
        { from: "q0", to: "q1", symbol: "0" },
        { from: "q0", to: "q2", symbol: "0" },
      ],
    });
    const errors = validateDFA(dfa);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe("duplicate-transition");
    expect(errors[0].stateId).toBe("q0");
    expect(errors[0].message).toContain("q0");
    expect(errors[0].message).toContain("'0'");
    expect(errors[0].message).toContain("deterministic");
  });

  it("allows the same symbol from different states", () => {
    const dfa = valid();
    expect(validateDFA(dfa)).toEqual([]);
  });

  it("rejects epsilon transitions in a DFA", () => {
    const dfa = makeDFA({
      states: [{ id: "q0", isStart: true }, { id: "q1" }],
      alphabet: ["a"],
      transitions: [{ from: "q0", to: "q1", symbol: "\u03B5" }],
    });
    const errors = validateDFA(dfa);
    expect(errors.some((e) => e.type === "epsilon-in-dfa")).toBe(true);
    expect(errors.some((e) => e.message.includes("epsilon"))).toBe(true);
  });

  it("flags symbols outside the alphabet", () => {
    const dfa = makeDFA({
      states: [{ id: "q0", isStart: true }, { id: "q1" }],
      alphabet: ["a"],
      transitions: [{ from: "q0", to: "q1", symbol: "b" }],
    });
    const errors = validateDFA(dfa);
    expect(errors.some((e) => e.type === "symbol-not-in-alphabet")).toBe(true);
    expect(errors.some((e) => e.message.includes("'b'"))).toBe(true);
  });

  it("requires exactly one start state", () => {
    const noStart = makeDFA({
      states: [{ id: "q0" }, { id: "q1" }],
      alphabet: ["a"],
      startState: null,
    });
    expect(
      noStart === null ? [] : validateDFA(noStart).map((e) => e.type),
    ).toContain("no-start-state");

    const twoFlags = makeDFA({
      states: [
        { id: "q0", isStart: true },
        { id: "q1", isStart: true },
      ],
      alphabet: ["a"],
    });
    expect(validateDFA(twoFlags).map((e) => e.type)).toContain(
      "multiple-start-flags",
    );
  });

  it("flags transitions pointing at missing states", () => {
    const dfa = makeDFA({
      states: [{ id: "q0", isStart: true }],
      alphabet: ["a"],
      transitions: [{ from: "q0", to: "ghost", symbol: "a" }],
    });
    const types = validateDFA(dfa).map((e) => e.type);
    expect(types).toContain("invalid-transition-target");
  });

  it("flags inconsistent accepting flags", () => {
    const dfa = makeDFA({
      states: [
        { id: "q0", isStart: true, isAccept: true },
        { id: "q1", isAccept: true },
      ],
      alphabet: ["a"],
      acceptStates: [],
    });
    const types = validateDFA(dfa).map((e) => e.type);
    expect(types).toContain("inconsistent-accept-flag");
  });
});

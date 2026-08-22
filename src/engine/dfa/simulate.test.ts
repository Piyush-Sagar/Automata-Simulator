import { describe, expect, it } from "vitest";
import { acceptsDFA, simulateDFA } from "./simulate";
import { makeDFA } from "../testing/factories";

function endsIn01() {
  return makeDFA({
    name: "ends-in-01",
    states: [
      { id: "q0", isStart: true },
      { id: "q1" },
      { id: "q2", isAccept: true },
    ],
    alphabet: ["0", "1"],
    acceptStates: ["q2"],
    transitions: [
      { from: "q0", to: "q1", symbol: "0" },
      { from: "q0", to: "q0", symbol: "1" },
      { from: "q1", to: "q1", symbol: "0" },
      { from: "q1", to: "q2", symbol: "1" },
      { from: "q2", to: "q1", symbol: "0" },
      { from: "q2", to: "q0", symbol: "1" },
    ],
  });
}

describe("simulateDFA", () => {
  const dfa = endsIn01();

  it("accepts strings ending in 01", () => {
    expect(simulateDFA(dfa, "01").status).toBe("ACCEPTED");
    expect(simulateDFA(dfa, "101").status).toBe("ACCEPTED");
    expect(simulateDFA(dfa, "1101100101").status).toBe("ACCEPTED");
  });

  it("rejects strings not ending in 01", () => {
    expect(simulateDFA(dfa, "010").status).toBe("REJECTED");
    expect(simulateDFA(dfa, "10").status).toBe("REJECTED");
    expect(simulateDFA(dfa, "").status).toBe("REJECTED");
  });

  it("produces a full execution trace with one step per symbol plus initial state", () => {
    const result = simulateDFA(dfa, "101");
    expect(result.steps).toHaveLength(4);
    expect(result.steps[0]).toMatchObject({
      step: 0,
      currentState: "q0",
      inputSymbol: null,
      inputIndex: -1,
      nextState: null,
      transitionId: null,
    });
    expect(result.steps[1]).toMatchObject({
      step: 1,
      currentState: "q0",
      inputSymbol: "1",
      inputIndex: 0,
      nextState: "q0",
    });
    expect(result.steps[2]).toMatchObject({
      step: 2,
      currentState: "q0",
      inputSymbol: "0",
      inputIndex: 1,
      nextState: "q1",
    });
    expect(result.steps[3]).toMatchObject({
      step: 3,
      currentState: "q1",
      inputSymbol: "1",
      inputIndex: 2,
      nextState: "q2",
    });
  });

  it("references real transition ids in the trace", () => {
    const result = simulateDFA(dfa, "101");
    for (const step of result.steps.slice(1)) {
      expect(step.transitionId).not.toBeNull();
      const match = dfa.transitions.find((t) => t.id === step.transitionId);
      expect(match).toBeDefined();
      expect(match?.from).toBe(step.currentState);
      expect(match?.symbol).toBe(step.inputSymbol);
    }
  });

  it("accepts empty input when the start state is accepting", () => {
    const loop = makeDFA({
      states: [{ id: "s", isStart: true, isAccept: true }],
      alphabet: ["a"],
      acceptStates: ["s"],
      transitions: [{ from: "s", to: "s", symbol: "a" }],
    });
    const result = simulateDFA(loop, "");
    expect(result.status).toBe("ACCEPTED");
    expect(result.steps).toHaveLength(1);
  });

  it("rejects with a helpful message when a transition is missing", () => {
    const partial = makeDFA({
      states: [
        { id: "q0", isStart: true },
        { id: "q1", isAccept: true },
      ],
      alphabet: ["0", "1"],
      acceptStates: ["q1"],
      transitions: [{ from: "q0", to: "q1", symbol: "0" }],
    });
    const result = simulateDFA(partial, "01");
    expect(result.status).toBe("REJECTED");
    expect(result.message).toContain("No transition exists from state q1");
    expect(result.message).toContain("'1'");
    expect(result.message).toContain("position 2");
    const last = result.steps[result.steps.length - 1];
    expect(last.nextState).toBeNull();
    expect(last.transitionId).toBeNull();
  });

  it("returns ERROR without steps for an invalid configuration (duplicate transitions)", () => {
    const invalid = makeDFA({
      states: [
        { id: "q0", isStart: true },
        { id: "q1" },
        { id: "q2" },
      ],
      alphabet: ["0"],
      transitions: [
        { from: "q0", to: "q1", symbol: "0" },
        { from: "q0", to: "q2", symbol: "0" },
      ],
    });
    const result = simulateDFA(invalid, "0");
    expect(result.status).toBe("ERROR");
    expect(result.steps).toHaveLength(0);
    expect(result.message).toContain("two transitions");
  });

  it("returns ERROR when there is no start state", () => {
    const noStart = makeDFA({
      states: [{ id: "q0" }, { id: "q1" }],
      alphabet: ["0"],
      startState: null,
      transitions: [],
    });
    const result = simulateDFA(noStart, "0");
    expect(result.status).toBe("ERROR");
  });

  it("times out on inputs longer than the configured limit", () => {
    const result = simulateDFA(
      dfa,
      "1".repeat(11),
      { maxSteps: 10000, maxInputLength: 10 },
    );
    expect(result.status).toBe("TIMEOUT");
    expect(result.steps).toHaveLength(0);
  });

  it("does not mutate the automaton during simulation", () => {
    const before = JSON.stringify(dfa);
    simulateDFA(dfa, "101101001");
    expect(JSON.stringify(dfa)).toBe(before);
  });

  it("acceptsDFA mirrors the ACCEPTED status", () => {
    expect(acceptsDFA(dfa, "001")).toBe(true);
    expect(acceptsDFA(dfa, "0010")).toBe(false);
  });
});

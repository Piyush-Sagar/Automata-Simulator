import { describe, it, expect } from "vitest";
import { epsilonClosure } from "../epsilonClosure";
import { EPSILON, type ENFA } from "../../types";

describe("epsilonClosure", () => {
  it("should return the state itself if there are no epsilon transitions", () => {
    const enfa: ENFA = {
      id: "1",
      name: "Test",
      type: "ENFA",
      states: [
        { id: "q0", label: "q0", x: 0, y: 0, isStart: true, isAccept: false },
        { id: "q1", label: "q1", x: 0, y: 0, isStart: false, isAccept: true },
      ],
      alphabet: ["0", "1"],
      startState: "q0",
      acceptStates: ["q1"],
      transitions: [{ id: "t1", from: "q0", to: "q1", symbol: "0" }],
    };

    const closure = epsilonClosure(enfa, ["q0"]);
    expect(Array.from(closure)).toEqual(["q0"]);
  });

  it("should compute epsilon closure with simple chain", () => {
    const enfa: ENFA = {
      id: "1",
      name: "Test",
      type: "ENFA",
      states: [],
      alphabet: ["0", "1"],
      startState: "q0",
      acceptStates: ["q2"],
      transitions: [
        { id: "t1", from: "q0", to: "q1", symbol: EPSILON },
        { id: "t2", from: "q1", to: "q2", symbol: EPSILON },
        { id: "t3", from: "q1", to: "q3", symbol: "0" },
      ],
    };

    const closure = epsilonClosure(enfa, ["q0"]);
    expect(Array.from(closure).sort()).toEqual(["q0", "q1", "q2"]);
  });

  it("should handle epsilon cycles correctly", () => {
    const enfa: ENFA = {
      id: "1",
      name: "Test",
      type: "ENFA",
      states: [],
      alphabet: ["0", "1"],
      startState: "q0",
      acceptStates: [],
      transitions: [
        { id: "t1", from: "q0", to: "q1", symbol: EPSILON },
        { id: "t2", from: "q1", to: "q2", symbol: EPSILON },
        { id: "t3", from: "q2", to: "q0", symbol: EPSILON },
        { id: "t4", from: "q2", to: "q3", symbol: "1" },
      ],
    };

    const closure = epsilonClosure(enfa, ["q1"]);
    expect(Array.from(closure).sort()).toEqual(["q0", "q1", "q2"]);
  });
});

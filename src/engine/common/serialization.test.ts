import { describe, expect, it } from "vitest";
import {
  SerializationError,
  deserializeAutomaton,
  parseAutomatonJson,
  serializeAutomaton,
} from "./serialization";
import {
  makeDFA,
  makeENFA,
  makeNFA,
  makePDA,
  makeTM,
} from "../testing/factories";

describe("serialization", () => {
  it("round-trips a DFA through JSON text without loss", () => {
    const dfa = makeDFA({
      name: "Binary strings ending in 01",
      states: [
        { id: "q0", isStart: true },
        { id: "q1" },
        { id: "q2", isAccept: true },
      ],
      alphabet: ["0", "1"],
      acceptStates: ["q2"],
      transitions: [
        { from: "q0", to: "q1", symbol: "0" },
        { from: "q1", to: "q2", symbol: "1" },
      ],
    });
    const parsed = parseAutomatonJson(serializeAutomaton(dfa));
    expect(parsed).toEqual(dfa);
  });

  it("parses NFA, ENFA, PDA and TM payloads via the discriminated union", () => {
    const nfa = makeNFA({
      states: [
        { id: "q0", isStart: true },
        { id: "q1", isAccept: true },
      ],
      alphabet: ["a"],
      acceptStates: ["q1"],
      transitions: [
        { from: "q0", to: "q0", symbol: "a" },
        { from: "q0", to: "q1", symbol: "a" },
      ],
    });
    const enfa = makeENFA({
      states: [
        { id: "q0", isStart: true },
        { id: "q1", isAccept: true },
      ],
      alphabet: ["a"],
      acceptStates: ["q1"],
      transitions: [{ from: "q0", to: "q1", symbol: "\u03B5" }],
    });
    const pda = makePDA({
      states: [
        { id: "q0", isStart: true },
        { id: "q1", isAccept: true },
      ],
      alphabet: ["a"],
      acceptStates: ["q1"],
      transitions: [
        {
          from: "q0",
          to: "q1",
          inputSymbol: "a",
          stackTop: "Z",
          stackReplacement: ["A", "Z"],
        },
      ],
    });
    const tm = makeTM({
      states: [
        { id: "q0", isStart: true },
        { id: "halt", isAccept: true },
      ],
      alphabet: ["0", "1"],
      acceptStates: ["halt"],
      transitions: [
        {
          from: "q0",
          to: "halt",
          readSymbol: "0",
          writeSymbol: "1",
          direction: "R",
        },
      ],
    });

    expect(deserializeAutomaton(nfa).type).toBe("NFA");
    expect(deserializeAutomaton(enfa).type).toBe("ENFA");
    const parsedPda = deserializeAutomaton(pda);
    expect(parsedPda.type).toBe("PDA");
    if (parsedPda.type === "PDA") {
      expect(parsedPda.acceptanceMode).toBe("FINAL_STATE");
      expect(parsedPda.initialStackSymbol).toBe("Z");
    }
    const parsedTm = deserializeAutomaton(tm);
    expect(parsedTm.type).toBe("TM");
    if (parsedTm.type === "TM") {
      expect(parsedTm.transitions[0].direction).toBe("R");
    }
  });

  it("rejects an unsupported version with a readable error", () => {
    const dfa = {
      ...makeDFA({ states: [{ id: "q0" }], alphabet: [] }),
      version: 99,
    };
    expect(() => deserializeAutomaton(dfa)).toThrow(SerializationError);
    expect(() => deserializeAutomaton(dfa)).toThrow(/version/i);
  });

  it("rejects unknown automaton types", () => {
    expect(() =>
      deserializeAutomaton({ version: 1, type: "MEALY", name: "x" }),
    ).toThrow(SerializationError);
  });

  it("rejects malformed JSON with the underlying parse problem", () => {
    expect(() => parseAutomatonJson("{not json")).toThrow(SerializationError);
  });

  it("rejects structurally broken payloads listing the offending paths", () => {
    const bad = {
      version: 1,
      type: "DFA",
      id: "d",
      name: "",
      states: [{ id: "", label: "" }],
      alphabet: [],
      startState: null,
      acceptStates: [],
      transitions: [],
    };
    let message = "";
    try {
      deserializeAutomaton(bad);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).toContain("not a valid serialized automaton");
    expect(message).toContain("-");
  });
});

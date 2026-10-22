import { describe, expect, it } from "vitest";
import { loadTemplate, templateInfo } from "./templates";
import { regexToENFA } from "./regex/thompson";
import { parseRegex } from "./regex/parser";
import { simulateNFA } from "./nfa/simulate";
import { simulateDFA } from "./dfa/simulate";
import { simulatePDA } from "./pda/simulate";
import { simulateTM } from "./tm/simulate";
import { simulateMachine } from "./simulate";
import { subsetConstruction } from "./nfa/subsetConstruction";
import { removeEpsilon } from "./nfa/removeEpsilon";
import { minimizeDFA } from "./dfa/minimize";
import { productIntersection } from "./common/product";
import { validateAutomaton } from "./common/validation";
import { parseAutomatonJson, serializeAutomaton } from "./common/serialization";
import type { PDA, TuringMachine, DFA } from "./types";

const limits = {
  maxSteps: 100,
  maxInputLength: 100,
  maxConfigurations: 500,
  maxStackDepth: 20,
};
function corpus(alphabet: string[], max = 5): string[] {
  const result = [""];
  let level = [""];
  for (let i = 0; i < max; i++) {
    level = level.flatMap((s) => alphabet.map((c) => s + c));
    result.push(...level);
  }
  return result;
}
function pda(): PDA {
  const a = loadTemplate("pda");
  if (a.type !== "PDA") throw new Error("Wrong fixture");
  return a;
}
function tm(): TuringMachine {
  const a = loadTemplate("tm");
  if (a.type !== "TM") throw new Error("Wrong fixture");
  return a;
}
function dfa(): DFA {
  const a = loadTemplate("ending");
  if (a.type !== "DFA") throw new Error("Wrong fixture");
  return a;
}

describe("real templates", () => {
  it.each(templateInfo)("$name validates and accepts its sample", (t) => {
    const a = loadTemplate(t.id);
    expect(validateAutomaton(a)).toEqual([]);
    expect(simulateMachine(a, t.sample, limits).status).toBe("ACCEPTED");
    expect(parseAutomatonJson(serializeAutomaton(a))).toEqual(a);
  });
});
describe("regex and conversion language equivalence", () => {
  it.each([
    "(a|b)*abb",
    "a*b*",
    "a|ab",
    "(ab)*",
    "a+b?",
    "(a|b)?a*",
    "a*(ba)*",
  ])(
    "preserves %s across Thompson, ε-removal, subset and minimization",
    (source) => {
      const enfa = regexToENFA(source),
        nfa = removeEpsilon(enfa),
        result = subsetConstruction(enfa);
      if ("error" in result) throw new Error(result.error);
      const min = minimizeDFA(result.dfa);
      if ("error" in min) throw new Error(min.error);
      const oracle = new RegExp(`^(?:${source})$`);
      for (const input of corpus(["a", "b"])) {
        const expected = oracle.test(input);
        expect(
          simulateNFA(enfa, input).status === "ACCEPTED",
          `${source}: ${input}`,
        ).toBe(expected);
        expect(simulateNFA(nfa, input).status === "ACCEPTED").toBe(expected);
        expect(simulateDFA(result.dfa, input).status === "ACCEPTED").toBe(
          expected,
        );
        expect(simulateDFA(min.dfa, input).status === "ACCEPTED").toBe(
          expected,
        );
      }
    },
  );
  it("handles empty language, empty input and escaped operators", () => {
    expect(simulateNFA(regexToENFA(""), "").status).toBe("ACCEPTED");
    expect(simulateNFA(regexToENFA("∅"), "").status).toBe("REJECTED");
    expect(simulateNFA(regexToENFA("ε|a"), "").status).toBe("ACCEPTED");
    expect(simulateNFA(regexToENFA("\\|\\*"), "|*").status).toBe("ACCEPTED");
  });
  it.each(["a|", "(a", "a)", "*a", "()", "a\\"])(
    "reports malformed expression %s",
    (source) => expect(() => parseRegex(source)).toThrow(),
  );
  it("limits construction growth", () =>
    expect(() => regexToENFA("a".repeat(257))).toThrow(/256/));
  it("supports single Unicode code points", () => {
    const nfa = regexToENFA("😀*");
    expect(
      simulateNFA(nfa, "😀😀", { maxSteps: 2, maxInputLength: 2 }).status,
    ).toBe("ACCEPTED");
    const result = subsetConstruction(nfa);
    if ("error" in result) throw new Error(result.error);
    expect(
      simulateDFA(result.dfa, "😀😀", { maxSteps: 2, maxInputLength: 2 })
        .status,
    ).toBe("ACCEPTED");
  });
  it("minimizes partial rejecting sinks by language, not missing-edge syntax", () => {
    const a = dfa();
    a.acceptStates = [];
    a.states = a.states.map((s) => ({ ...s, isAccept: false }));
    a.transitions = a.transitions.filter((t) => t.from !== "q1");
    const min = minimizeDFA(a);
    if ("error" in min) throw new Error(min.error);
    expect(min.dfa.states).toHaveLength(1);
    expect(min.dfa.transitions).toHaveLength(2);
  });
  it("completes subset construction with the empty subset", () => {
    const result = subsetConstruction(regexToENFA("a"));
    if ("error" in result) throw new Error(result.error);
    expect([...result.trace.mapping.values()]).toContainEqual([]);
    expect(result.dfa.transitions.length).toBe(result.dfa.states.length);
  });
});
describe("pushdown simulation", () => {
  it.each(["", "01", "0011", "000111"])("accepts balanced %s", (input) =>
    expect(simulatePDA(pda(), input, limits).status).toBe("ACCEPTED"),
  );
  it.each(["0", "1", "001", "011", "0101", "10"])(
    "rejects unbalanced %s",
    (input) =>
      expect(simulatePDA(pda(), input, limits).status).toBe("REJECTED"),
  );
  it("requires complete input even if the start state accepts", () => {
    const a = pda();
    a.acceptStates.push("q0");
    a.states[0].isAccept = true;
    expect(simulatePDA(a, "1", limits).status).toBe("REJECTED");
  });
  it("supports empty-stack acceptance independently of final states", () => {
    const a = pda();
    a.acceptanceMode = "EMPTY_STACK";
    a.acceptStates = [];
    a.states = a.states.map((s) => ({ ...s, isAccept: false }));
    expect(simulatePDA(a, "0011", limits).status).toBe("ACCEPTED");
  });
  it("deduplicates ε cycles and reports stack explosion as unknown", () => {
    const a = pda();
    a.transitions = [
      {
        id: "loop",
        from: "q0",
        to: "q0",
        inputSymbol: "ε",
        stackTop: "Z",
        stackReplacement: ["Z"],
      },
    ];
    expect(simulatePDA(a, "", limits).status).toBe("REJECTED");
    a.transitions[0].stackReplacement = ["Z", "Z"];
    expect(simulatePDA(a, "", { ...limits, maxStackDepth: 5 }).status).toBe(
      "TIMEOUT",
    );
  });
  it("retains genuine stack snapshots without mutating the machine", () => {
    const a = pda(),
      before = JSON.stringify(a),
      result = simulatePDA(a, "0011", limits);
    expect(result.steps[0].configurations[0].stack).toEqual(["Z"]);
    expect(
      result.steps
        .flatMap((s) => s.configurations)
        .some((c) => c.stack.join("") === "ZAA"),
    ).toBe(true);
    expect(JSON.stringify(a)).toBe(before);
  });
  it("does not claim rejection when the configuration budget is exceeded", () =>
    expect(
      simulatePDA(pda(), "0011", { ...limits, maxConfigurations: 1 }).status,
    ).toBe("TIMEOUT"));
});
describe("Turing machine simulation", () => {
  it("writes the real output and preserves earlier tape snapshots", () => {
    const a = tm(),
      before = JSON.stringify(a),
      result = simulateTM(a, "10110", limits);
    expect(result.status).toBe("ACCEPTED");
    expect(
      result.steps
        .at(-1)
        ?.tape.sort((x, y) => x[0] - y[0])
        .map((c) => c[1])
        .join(""),
    ).toBe("01001");
    expect(result.steps[0].tape.map((c) => c[1]).join("")).toBe("10110");
    expect(JSON.stringify(a)).toBe(before);
  });
  it("supports negative tape positions and stationary movement", () => {
    const a = tm();
    a.transitions = [
      {
        id: "left",
        from: "q0",
        to: "halt",
        readSymbol: "0",
        writeSymbol: "1",
        direction: "L",
      },
    ];
    expect(simulateTM(a, "0", limits).steps.at(-1)?.head).toBe(-1);
    a.transitions[0].direction = "S";
    expect(simulateTM(a, "0", limits).steps.at(-1)?.head).toBe(0);
  });
  it("halts at an explicit reject state or a missing rule", () => {
    const a = tm();
    a.acceptStates = [];
    a.states[1].isAccept = false;
    a.rejectState = "halt";
    expect(simulateTM(a, "", limits).status).toBe("REJECTED");
    a.transitions = [];
    expect(simulateTM(a, "0", limits).message).toMatch(/No transition/);
  });
  it("bounds a machine that never halts", () => {
    const a = tm();
    a.transitions = [
      {
        id: "loop",
        from: "q0",
        to: "q0",
        readSymbol: "□",
        writeSymbol: "□",
        direction: "R",
      },
    ];
    const result = simulateTM(a, "", { ...limits, maxSteps: 5 });
    expect(result.status).toBe("TIMEOUT");
    expect(result.steps).toHaveLength(6);
  });
  it("rejects nondeterministic tape rules", () => {
    const a = tm();
    a.transitions.push({ ...a.transitions[0], id: "duplicate" });
    expect(simulateTM(a, "0", limits).status).toBe("ERROR");
  });
});
describe("products, validation and limits", () => {
  it("computes the intersection for DFA and NFA inputs over a corpus", () => {
    const a = loadTemplate("contains"),
      b = loadTemplate("nfa");
    if (a.type !== "DFA" || b.type !== "NFA") throw new Error("Wrong fixtures");
    const product = productIntersection(a, b);
    for (const input of corpus(["0", "1"], 6))
      expect(simulateDFA(product, input).status === "ACCEPTED").toBe(
        simulateDFA(a, input).status === "ACCEPTED" &&
          simulateNFA(b, input).status === "ACCEPTED",
      );
  });
  it("supports ε-NFA products and differing alphabets", () => {
    const a = regexToENFA("a*"),
      b = regexToENFA("b*");
    const product = productIntersection(a, b);
    expect(simulateDFA(product, "").status).toBe("ACCEPTED");
    expect(simulateDFA(product, "a").status).toBe("REJECTED");
    expect(simulateDFA(product, "b").status).toBe("REJECTED");
  });
  it("dispatches NFA validation instead of structural validation only", () => {
    const a = regexToENFA("a*");
    expect(
      validateAutomaton({ ...a, type: "NFA" }).some(
        (e) => e.type === "epsilon-in-strict-nfa",
      ),
    ).toBe(true);
  });
  it("enforces maxSteps for both finite simulators", () => {
    expect(simulateDFA(dfa(), "000", { ...limits, maxSteps: 1 }).status).toBe(
      "TIMEOUT",
    );
    expect(
      simulateNFA(regexToENFA("0*"), "000", { ...limits, maxSteps: 1 }).status,
    ).toBe("TIMEOUT");
  });
  it("validates unknown input and bad limits", () => {
    expect(simulateTM(tm(), "x", limits).status).toBe("ERROR");
    expect(simulateDFA(dfa(), "", { ...limits, maxSteps: -1 }).status).toBe(
      "ERROR",
    );
  });
  it("highlights the destination configuration after a transition", () => {
    const a = dfa(),
      result = simulateMachine(a, "01", limits);
    expect(result.steps.at(-1)?.activeStates).toEqual(["q2"]);
    expect(result.steps.at(-1)?.inputIndex).toBe(2);
  });
});

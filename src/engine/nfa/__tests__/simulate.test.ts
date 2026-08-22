import { describe, it, expect } from "vitest";
import { simulateNFA } from "../simulate";
import { EPSILON, type ENFA } from "../../types";

describe("simulateNFA", () => {
  it("should simulate an ENFA successfully", () => {
    // ENFA that accepts strings ending with '00' or '11'
    const enfa: ENFA = {
      id: "1",
      name: "Test",
      type: "ENFA",
      states: [
        { id: "q0", label: "q0", x: 0, y: 0, isStart: true, isAccept: false },
        { id: "q1", label: "q1", x: 0, y: 0, isStart: false, isAccept: false },
        { id: "q2", label: "q2", x: 0, y: 0, isStart: false, isAccept: false },
        { id: "q3", label: "q3", x: 0, y: 0, isStart: false, isAccept: true },
        { id: "q4", label: "q4", x: 0, y: 0, isStart: false, isAccept: true },
      ],
      alphabet: ["0", "1"],
      startState: "q0",
      acceptStates: ["q3", "q4"],
      transitions: [
        { id: "t1", from: "q0", to: "q0", symbol: "0" },
        { id: "t2", from: "q0", to: "q0", symbol: "1" },
        { id: "t3", from: "q0", to: "q1", symbol: EPSILON }, // branch 1 for '00'
        { id: "t4", from: "q0", to: "q2", symbol: EPSILON }, // branch 2 for '11'
        { id: "t5", from: "q1", to: "q3", symbol: "0" },
        { id: "t6", from: "q3", to: "q3", symbol: "0" }, // actually wait, '00' at end doesn't need loop. Let's just do a 2-step.
      ],
    };
    // Redefining the transitions for a proper "ends with 00 or 11"
    enfa.transitions = [
        { id: "t1", from: "q0", to: "q0", symbol: "0" },
        { id: "t2", from: "q0", to: "q0", symbol: "1" },
        { id: "t3", from: "q0", to: "q1", symbol: EPSILON }, // guess 00
        { id: "t4", from: "q0", to: "q2", symbol: EPSILON }, // guess 11
        { id: "t5", from: "q1", to: "q3", symbol: "0" },
        { id: "t6", from: "q3", to: "q3", symbol: "0" }, // Wait, if I do q1->q3 on 0, then q3 is accept? Then it accepts ending in 0? No, let's just make it simple: q1->q3(0), q3->q4(0)
    ];
    enfa.acceptStates = ["q4"];
    // Removed q5 push
    enfa.transitions = [
        { id: "t1", from: "q0", to: "q0", symbol: "0" },
        { id: "t2", from: "q0", to: "q0", symbol: "1" },
        { id: "t3", from: "q0", to: "q1", symbol: "0" },
        { id: "t4", from: "q1", to: "q3", symbol: "0" },
        { id: "t5", from: "q0", to: "q2", symbol: "1" },
        { id: "t6", from: "q2", to: "q4", symbol: "1" },
    ];
    enfa.acceptStates = ["q3", "q4"];
    
    // Simulate with "0100" -> Ends with 00 -> Accept
    const res1 = simulateNFA(enfa, "0100");
    if (res1.status === "ERROR") console.error(res1.message);
    expect(res1.status).toBe("ACCEPTED");

    // Simulate with "0101" -> Ends with 01 -> Reject
    const res2 = simulateNFA(enfa, "0101");
    expect(res2.status).toBe("REJECTED");
  });
});

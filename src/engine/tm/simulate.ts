import {
  DEFAULT_SIMULATION_LIMITS,
  type TuringMachine,
  type SimulationLimits,
  type SimulationResult,
} from "../types";
import { validateTM } from "./validate";
import { limitError } from "../common/limits";

export interface TMStep {
  step: number;
  currentState: string;
  head: number;
  tape: [number, string][];
  transitionId: string | null;
}

export function simulateTM(
  a: TuringMachine,
  input: string,
  limits: SimulationLimits = DEFAULT_SIMULATION_LIMITS,
): SimulationResult<TMStep> {
  const errors = validateTM(a);
  if (errors.length)
    return {
      status: "ERROR",
      steps: [],
      message: errors.map((e) => e.message).join("\n"),
    };
  const problem = limitError(input, a.alphabet, limits);
  if (problem)
    return {
      status: input.length > limits.maxInputLength ? "TIMEOUT" : "ERROR",
      steps: [],
      message: problem,
    };
  const tape = new Map<number, string>(Array.from(input).map((s, i) => [i, s]));
  const table = new Map(
    a.transitions.map((t) => [JSON.stringify([t.from, t.readSymbol]), t]),
  );
  let currentState = a.startState!,
    head = 0,
    cells = 0;
  const steps: TMStep[] = [
    { step: 0, currentState, head, tape: [...tape], transitionId: null },
  ];
  for (let i = 0; i <= limits.maxSteps; i++) {
    if (a.acceptStates.includes(currentState))
      return {
        status: "ACCEPTED",
        steps,
        message: "Machine entered an accepting state.",
      };
    if (currentState === a.rejectState)
      return {
        status: "REJECTED",
        steps,
        message: "Machine entered the reject state.",
      };
    const read = tape.get(head) ?? a.blankSymbol;
    const t = table.get(JSON.stringify([currentState, read]));
    if (!t)
      return {
        status: "REJECTED",
        steps,
        message: `No transition exists from ${a.states.find((s) => s.id === currentState)?.label} reading '${read}'.`,
      };
    if (i === limits.maxSteps || cells + tape.size > 2_000_000)
      return {
        status: "TIMEOUT",
        steps,
        message: "Execution or trace memory limit reached; halting is unknown.",
      };
    if (t.writeSymbol === a.blankSymbol) tape.delete(head);
    else tape.set(head, t.writeSymbol);
    head += t.direction === "L" ? -1 : t.direction === "R" ? 1 : 0;
    currentState = t.to;
    cells += tape.size;
    steps.push({
      step: steps.length,
      currentState,
      head,
      tape: [...tape],
      transitionId: t.id,
    });
  }
  return { status: "TIMEOUT", steps, message: "Step limit reached." };
}

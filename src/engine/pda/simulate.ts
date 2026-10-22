import {
  DEFAULT_SIMULATION_LIMITS,
  type PDA,
  type PDAConfiguration,
  type SimulationLimits,
  type SimulationResult,
} from "../types";
import { validatePDA } from "./validate";
import { limitError } from "../common/limits";

export interface PDAStep {
  step: number;
  configurations: PDAConfiguration[];
  transitionIds: string[];
}

/** Breadth-first exploration. Every displayed configuration is real, including its stack. */
export function simulatePDA(
  a: PDA,
  input: string,
  limits: SimulationLimits = DEFAULT_SIMULATION_LIMITS,
): SimulationResult<PDAStep> {
  const errors = validatePDA(a);
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
  const maxConfigs = limits.maxConfigurations ?? 2000;
  const maxStack = limits.maxStackDepth ?? 256;
  if (
    !Number.isInteger(maxConfigs) ||
    maxConfigs < 1 ||
    maxConfigs > 20000 ||
    !Number.isInteger(maxStack) ||
    maxStack < 1 ||
    maxStack > 1000
  )
    return {
      status: "ERROR",
      steps: [],
      message:
        "Configuration limit must be 1–20000; stack limit must be 1–1000.",
    };
  const symbols = Array.from(input);
  let frontier: PDAConfiguration[] = [
    { state: a.startState!, inputIndex: 0, stack: [a.initialStackSymbol] },
  ];
  const key = (c: PDAConfiguration) =>
    JSON.stringify([c.state, c.inputIndex, c.stack]);
  const visited = new Set(frontier.map(key));
  const steps: PDAStep[] = [
    { step: 0, configurations: frontier, transitionIds: [] },
  ];
  let clipped = false;
  let traceCells = 1;
  let operations = 0;
  for (let depth = 0; depth <= limits.maxSteps; depth++) {
    if (
      frontier.some(
        (c) =>
          c.inputIndex === symbols.length &&
          (a.acceptanceMode === "EMPTY_STACK"
            ? c.stack.length === 0
            : a.acceptStates.includes(c.state)),
      )
    ) {
      return {
        status: "ACCEPTED",
        steps,
        message: "An accepting configuration consumed the entire input.",
      };
    }
    if (depth === limits.maxSteps)
      return {
        status: "TIMEOUT",
        steps,
        message: "Step limit reached; acceptance is unknown.",
      };
    const next: PDAConfiguration[] = [];
    const used = new Set<string>();
    for (const c of frontier) {
      for (const t of a.transitions) {
        if (++operations > 2_000_000)
          return {
            status: "TIMEOUT",
            steps,
            message: "Exploration work budget reached; acceptance is unknown.",
          };
        if (
          t.from !== c.state ||
          c.stack.at(-1) !== t.stackTop ||
          (t.inputSymbol !== "ε" && t.inputSymbol !== symbols[c.inputIndex])
        )
          continue;
        const stack = [...c.stack.slice(0, -1), ...t.stackReplacement];
        if (stack.length > maxStack) {
          clipped = true;
          continue;
        }
        const candidate = {
          state: t.to,
          inputIndex: c.inputIndex + (t.inputSymbol === "ε" ? 0 : 1),
          stack,
        };
        const id = key(candidate);
        if (visited.has(id)) continue;
        if (traceCells + stack.length > 2_000_000) {
          clipped = true;
          continue;
        }
        if (visited.size >= maxConfigs) {
          clipped = true;
          continue;
        }
        traceCells += stack.length;
        visited.add(id);
        next.push(candidate);
        used.add(t.id);
      }
    }
    if (!next.length)
      return {
        status: clipped ? "TIMEOUT" : "REJECTED",
        steps,
        message: clipped
          ? "Configuration or stack budget reached; acceptance is unknown."
          : "All configurations exhausted without accepting the complete input.",
      };
    frontier = next;
    steps.push({
      step: steps.length,
      configurations: frontier,
      transitionIds: [...used],
    });
  }
  return { status: "TIMEOUT", steps, message: "Step limit reached." };
}

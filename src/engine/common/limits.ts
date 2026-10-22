import type { SimulationLimits } from "../types";

export function limitError(
  input: string,
  alphabet: string[],
  limits: SimulationLimits,
): string | null {
  if (
    !Number.isInteger(limits.maxSteps) ||
    limits.maxSteps < 1 ||
    limits.maxSteps > 10000 ||
    !Number.isInteger(limits.maxInputLength) ||
    limits.maxInputLength < 0 ||
    limits.maxInputLength > 10000
  ) {
    return "Limits must be integers: 1–10000 steps and 0–10000 input symbols.";
  }
  const symbols = Array.from(input);
  if (symbols.length > limits.maxInputLength)
    return `Input length ${symbols.length} exceeds maximum of ${limits.maxInputLength}.`;
  const unknown = symbols.find((s) => !alphabet.includes(s));
  return unknown === undefined
    ? null
    : `Input symbol '${unknown}' is not in the input alphabet.`;
}

import type { BaseAutomaton } from "../types";

export interface ValidationError {
  type: string;
  message: string;
  stateId?: string;
  transitionId?: string;
}

export function validateStructure(automaton: BaseAutomaton): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!automaton.name.trim())
    errors.push({ type: "empty-name", message: "The machine needs a name." });
  const stateIds = new Set(automaton.states.map((s) => s.id));
  if (automaton.states.length > 512 || automaton.alphabet.length > 64)
    errors.push({
      type: "resource-limit",
      message: "Machines are limited to 512 states and 64 input symbols.",
    });
  if (stateIds.size !== automaton.states.length)
    errors.push({
      type: "duplicate-state",
      message: "State IDs must be unique.",
    });
  if (
    new Set(automaton.states.map((s) => s.label)).size !==
    automaton.states.length
  )
    errors.push({
      type: "duplicate-label",
      message: "State labels must be unique.",
    });
  if (automaton.states.some((s) => !s.label.trim()))
    errors.push({ type: "empty-label", message: "Every state needs a label." });

  if (automaton.states.length === 0) {
    errors.push({
      type: "empty-states",
      message: "The automaton has no states.",
    });
    return errors;
  }

  if (!automaton.startState) {
    errors.push({
      type: "no-start-state",
      message:
        "No start state is defined. Exactly one state must be marked as the start state.",
    });
  } else if (!stateIds.has(automaton.startState)) {
    errors.push({
      type: "invalid-start-state",
      message: `The start state "${automaton.startState}" does not exist.`,
      stateId: automaton.startState,
    });
  }

  const flaggedStart = automaton.states.filter((s) => s.isStart);
  if (automaton.startState && flaggedStart.length === 0)
    errors.push({
      type: "start-mismatch",
      message: "The start state must also be marked with its start flag.",
    });
  if (flaggedStart.length > 1) {
    errors.push({
      type: "multiple-start-flags",
      message: `Multiple states are marked as start: ${flaggedStart
        .map((s) => s.label)
        .join(", ")}. Exactly one is allowed.`,
      stateId: flaggedStart[1].id,
    });
  }
  if (
    flaggedStart.length >= 1 &&
    automaton.startState &&
    flaggedStart[0].id !== automaton.startState
  ) {
    errors.push({
      type: "start-mismatch",
      message: `The start state field ("${automaton.startState}") does not match the flagged start state (${flaggedStart[0].label}).`,
    });
  }

  for (const id of automaton.acceptStates) {
    if (!stateIds.has(id)) {
      errors.push({
        type: "invalid-accept-state",
        message: `Accepting state list references missing state "${id}".`,
        stateId: id,
      });
    }
  }

  for (const state of automaton.states) {
    const listed = automaton.acceptStates.includes(state.id);
    if (state.isAccept !== listed) {
      errors.push({
        type: "inconsistent-accept-flag",
        message: `State ${state.label}: accepting flag (${state.isAccept}) disagrees with acceptStates list (${listed}).`,
        stateId: state.id,
      });
    }
  }

  return errors;
}

export function validateAlphabet(automaton: BaseAutomaton): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  for (const symbol of automaton.alphabet) {
    if (Array.from(symbol).length !== 1 || symbol === "ε")
      errors.push({
        type: "invalid-symbol",
        message: `Alphabet symbol '${symbol}' must be one Unicode character other than ε.`,
      });
    if (symbol === "") {
      errors.push({
        type: "empty-alphabet-symbol",
        message:
          "The alphabet contains an empty string; alphabet symbols must be non-empty.",
      });
    }
    if (seen.has(symbol)) {
      errors.push({
        type: "duplicate-alphabet-symbol",
        message: `The alphabet lists symbol '${symbol}' more than once.`,
      });
    }
    seen.add(symbol);
  }
  return errors;
}

export function checkTransitionEndpoints(
  automaton: BaseAutomaton,
  transitions: Array<{ id: string; from: string; to: string }>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (transitions.length > 10000)
    errors.push({
      type: "resource-limit",
      message: "Machines are limited to 10000 transitions.",
    });
  const stateIds = new Set(automaton.states.map((s) => s.id));
  if (new Set(transitions.map((t) => t.id)).size !== transitions.length)
    errors.push({
      type: "duplicate-transition",
      message: "Transition IDs must be unique.",
    });
  for (const t of transitions) {
    if (!stateIds.has(t.from)) {
      errors.push({
        type: "invalid-transition-source",
        message: `Transition "${t.id}" starts at unknown state "${t.from}".`,
        transitionId: t.id,
      });
    }
    if (!stateIds.has(t.to)) {
      errors.push({
        type: "invalid-transition-target",
        message: `Transition "${t.id}" points to unknown state "${t.to}".`,
        transitionId: t.id,
      });
    }
  }
  return errors;
}

export * from "./types";
export {
  canonicalSetKey,
  clamp,
  createId,
  formatIdSet,
  range,
  setKeyToIds,
  uniqueBy,
} from "./common/utilities";
export {
  formatValidationErrors,
  validateAutomaton,
  type ValidationError,
} from "./common/validation";
export {
  checkTransitionEndpoints,
  validateAlphabet,
  validateStructure,
} from "./common/sharedChecks";
export type { ValidationError as SharedValidationError } from "./common/sharedChecks";
export {
  SerializationError,
  deserializeAutomaton,
  parseAutomatonJson,
  serializeAutomaton,
  SERIALIZATION_VERSION,
} from "./common/serialization";
export {
  acceptsDFA,
  buildDFATransitionTable,
  simulateDFA,
  transitionKey,
  type DFAStep,
} from "./dfa/simulate";
export { validateDFA } from "./dfa/validate";

import { beforeEach, describe, expect, it } from "vitest";
import { useAutomataStore as store } from "./automataStore";
import { useSimulationStore as simulation } from "./simulationStore";
import { emptyMachine, loadTemplate } from "../engine/templates";
import { simulateMachine } from "../engine/simulate";
const limits = { maxSteps: 100, maxInputLength: 100 };
beforeEach(() => {
  store.setState({
    automaton: emptyMachine(),
    past: [],
    future: [],
    transaction: null,
    selectedNodes: [],
    selectedEdges: [],
  });
  simulation.getState().setSimulationResult(null);
});
describe("document history and simulation consistency", () => {
  it("places repeated state additions apart", () => {
    store.getState().addState(100, 100);
    store.getState().addState(100, 100);
    const [a, b] = store.getState().automaton.states;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(100);
  });
  it("clears a deleted TM reject-state reference", () => {
    const a = loadTemplate("tm");
    if (a.type !== "TM") throw new Error("Wrong fixture");
    a.acceptStates = [];
    a.states = a.states.map((s) => ({ ...s, isAccept: false }));
    a.rejectState = "halt";
    store.getState().setAutomaton(a);
    store.getState().removeState("halt");
    expect(store.getState().automaton).toHaveProperty("rejectState", null);
    expect(store.getState().validate()).toEqual([]);
  });
  it("undoes and redoes state addition", () => {
    store.getState().addState(10, 20);
    expect(store.getState().automaton.states).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().automaton.states).toHaveLength(0);
    store.getState().redo();
    expect(store.getState().automaton.states).toHaveLength(1);
  });
  it("coalesces a drag into a single undo entry", () => {
    store.getState().addState(10, 20);
    const id = store.getState().automaton.states[0].id;
    store.getState().beginTransaction();
    store.getState().updateState(id, { x: 30 });
    store.getState().updateState(id, { x: 40 });
    store.getState().endTransaction();
    expect(store.getState().past).toHaveLength(2);
    store.getState().undo();
    expect(store.getState().automaton.states[0].x).toBe(10);
  });
  it("deletes attached transitions and restores them on undo", () => {
    store.getState().setAutomaton(loadTemplate("tm"));
    store.getState().removeState("q0");
    expect(store.getState().automaton.transitions).toHaveLength(0);
    expect(store.getState().automaton.startState).toBeNull();
    store.getState().undo();
    expect(store.getState().automaton.transitions).toHaveLength(3);
  });
  it("clears stale simulation on document edits", () => {
    const a = loadTemplate("ending");
    store.getState().setAutomaton(a);
    simulation.getState().setSimulationResult(simulateMachine(a, "01", limits));
    store.getState().toggleAcceptState("q0");
    expect(simulation.getState().simulationResult).toBeNull();
  });
  it("clears redo history after a new edit", () => {
    store.getState().addState(0, 0);
    store.getState().undo();
    store.getState().addState(1, 1);
    expect(store.getState().future).toHaveLength(0);
  });
  it("creates correctly shaped PDA and TM machines", () => {
    store.getState().setAutomatonType("PDA");
    expect(store.getState().automaton).toHaveProperty(
      "initialStackSymbol",
      "Z",
    );
    store.getState().setAutomatonType("TM");
    expect(store.getState().automaton).toHaveProperty("blankSymbol", "□");
  });
  it("keeps start and accept flags synchronized", () => {
    store.getState().setAutomaton(loadTemplate("ending"));
    store.getState().setStartState("q1");
    store.getState().toggleAcceptState("q0");
    expect(store.getState().validate()).toEqual([]);
  });
  it("caps history and clamps playback indexes", () => {
    for (let i = 0; i < 110; i++)
      store
        .getState()
        .updateMachine({ ...store.getState().automaton, name: String(i) });
    expect(store.getState().past).toHaveLength(100);
    simulation
      .getState()
      .setSimulationResult(
        simulateMachine(loadTemplate("ending"), "01", limits),
      );
    simulation.getState().setCurrentStepIndex(100);
    expect(simulation.getState().currentStepIndex).toBe(2);
    simulation.getState().stepForward();
    expect(simulation.getState().currentStepIndex).toBe(2);
  });
});

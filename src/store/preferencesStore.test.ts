import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePreferencesStore as preferences } from "./preferencesStore";
import { useAutomataStore as document } from "./automataStore";
import { loadTemplate } from "../engine/templates";
import { STORAGE_KEYS, readLibrary, writeDraft } from "../lib/storage";
import { parseAutomatonJson } from "../engine/common/serialization";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  preferences.setState({
    ready: false,
    library: [],
    libraryReadable: true,
    notice: "",
  });
  document.setState({
    automaton: loadTemplate("ending"),
    past: [],
    future: [],
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("persistent library and settings", () => {
  it("does not replace the current document with an older draft when saving before initialization", () => {
    writeDraft(loadTemplate("tm"));
    const current = document.getState().automaton;
    preferences.getState().save();
    expect(document.getState().automaton).toEqual(current);
    expect(readLibrary()[0].machine.id).toBe(current.id);
  });
  it("saves several machines without replacing existing entries", () => {
    preferences.getState().initialize();
    preferences.getState().save();
    document.getState().setAutomaton(loadTemplate("pda"));
    preferences.getState().save();
    expect(readLibrary().map((e) => e.machine.type)).toEqual(["PDA", "DFA"]);
    preferences.setState({ ready: false, library: [] });
    preferences.getState().initialize();
    expect(preferences.getState().library).toHaveLength(2);
  });
  it("flushes the draft on an explicit save", () => {
    preferences.getState().save();
    expect(parseAutomatonJson(values.get(STORAGE_KEYS.draft)!)).toEqual(
      document.getState().automaton,
    );
  });
  it("supports duplication, renaming and deletion independently of the document", () => {
    preferences.getState().save();
    const id = document.getState().automaton.id;
    preferences.getState().duplicateSaved(id);
    const copy = preferences.getState().library[0].machine;
    expect(copy.id).not.toBe(id);
    preferences.getState().renameSaved(copy.id, "My copy");
    preferences.getState().removeSaved(id);
    expect(readLibrary()[0].machine.name).toBe("My copy");
    expect(document.getState().automaton.id).toBe(id);
  });
  it("preserves unreadable library data instead of overwriting it on save", () => {
    values.set(STORAGE_KEYS.library, "broken JSON");
    preferences.getState().initialize();
    preferences.getState().save();
    expect(values.get(STORAGE_KEYS.library)).toBe("broken JSON");
    expect(preferences.getState().libraryReadable).toBe(false);
    expect(preferences.getState().notice).toMatch(/unreadable/);
  });
  it("reports unavailable storage without losing the current machine", () => {
    preferences.getState().initialize();
    const before = document.getState().automaton;
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    });
    preferences.getState().save();
    expect(preferences.getState().notice).toMatch(/Export JSON/);
    expect(document.getState().automaton).toEqual(before);
  });
  it("persists valid settings and rejects invalid limits", () => {
    const valid = {
      theme: "dark" as const,
      maxSteps: 30,
      maxInputLength: 50,
      maxConfigurations: 100,
      maxStackDepth: 50,
    };
    preferences.getState().updateSettings(valid);
    preferences.setState({ ready: false });
    preferences.getState().initialize();
    expect(preferences.getState().settings).toEqual(valid);
    preferences.getState().updateSettings({ ...valid, maxSteps: -5 });
    expect(preferences.getState().settings).toEqual(valid);
  });
  it("restores unfinished draft fields for editing", () => {
    const a = loadTemplate("ending");
    a.name = "";
    a.states[0].label = "";
    writeDraft(a);
    preferences.getState().initialize();
    expect(document.getState().automaton.name).toBe("");
    expect(
      document
        .getState()
        .validate()
        .some((e) => e.type === "empty-name"),
    ).toBe(true);
  });
});

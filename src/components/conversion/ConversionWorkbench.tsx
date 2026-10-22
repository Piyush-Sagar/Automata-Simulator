"use client";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, GitMerge } from "lucide-react";
import type { AnyAutomaton } from "../../engine/types";
import { regexToENFA } from "../../engine/regex/thompson";
import { parseRegex } from "../../engine/regex/parser";
import { subsetConstruction } from "../../engine/nfa/subsetConstruction";
import { removeEpsilon } from "../../engine/nfa/removeEpsilon";
import { minimizeDFA } from "../../engine/dfa/minimize";
import { productIntersection } from "../../engine/common/product";
import { useAutomataStore } from "../../store/automataStore";
import { usePreferencesStore } from "../../store/preferencesStore";

export interface ConversionStage {
  title: string;
  machine: AnyAutomaton;
  explanation: string;
}
export function ConversionWorkbench({
  onOpenEditor,
}: {
  onOpenEditor: () => void;
}) {
  const { automaton, setAutomaton } = useAutomataStore();
  const library = usePreferencesStore((s) => s.library);
  const [regex, setRegex] = useState("(a|b)*abb"),
    [error, setError] = useState("");
  const [stages, setStages] = useState<ConversionStage[]>([]),
    [detail, setDetail] = useState("");
  const [second, setSecond] = useState("");
  const perform = (action: () => void) => {
    try {
      setError("");
      action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };
  function pipeline(source: AnyAutomaton) {
    if (source.type === "PDA" || source.type === "TM")
      throw new Error("This conversion requires a finite automaton.");
    const rows: ConversionStage[] = [
      {
        title: source.type === "ENFA" ? "ε-NFA" : source.type,
        machine: source,
        explanation: "Original machine",
      },
    ];
    if (source.type === "ENFA") {
      const nfa = removeEpsilon(source);
      rows.push({
        title: "NFA",
        machine: nfa,
        explanation:
          "ε-closures eliminate empty-input transitions while preserving the language.",
      });
    }
    const result =
      source.type === "DFA"
        ? { dfa: source, trace: { mapping: new Map<string, string[]>() } }
        : subsetConstruction(source);
    if ("error" in result) throw new Error(result.error);
    if (source.type !== "DFA")
      rows.push({
        title: "DFA",
        machine: result.dfa,
        explanation: [...result.trace.mapping]
          .map(
            ([id, members]) =>
              `${id} = {${members.map((id) => source.states.find((s) => s.id === id)?.label ?? id).join(", ")}}`,
          )
          .join("\n"),
      });
    const minimized = minimizeDFA(result.dfa);
    if ("error" in minimized) throw new Error(minimized.error);
    rows.push({
      title: "Minimized DFA",
      machine: minimized.dfa,
      explanation: minimized.trace.steps
        .map(
          (step, i) =>
            `Round ${i}: ${step.partitions.map((p) => `{${p.join(", ")}}`).join(" | ")}`,
        )
        .join("\n"),
    });
    setStages(rows);
  }
  return (
    <main className="content-page">
      <div className="page-intro">
        <h1>Convert automata</h1>
        <p>Convert a regular expression or finite automaton.</p>
      </div>
      <div className="workbench-grid">
        <section className="surface-card">
          <span className="pill">THOMPSON CONSTRUCTION</span>
          <h2>Start with an expression</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              perform(() => {
                const ast = parseRegex(regex);
                pipeline(regexToENFA(regex));
                setDetail(JSON.stringify(ast, null, 2));
              });
            }}
          >
            <label>
              Regular expression
              <input
                className="regex-input"
                value={regex}
                onChange={(e) => setRegex(e.target.value)}
                spellCheck={false}
              />
            </label>
            <p className="muted">
              Union <code>|</code> · concatenation · repetition{" "}
              <code>* + ?</code> · groups <code>()</code> · empty input{" "}
              <code>ε</code> · empty language <code>∅</code>. Escape operators
              with a backslash.
            </p>
            <button className="button primary" type="submit">
              Build conversion pipeline <ArrowRight size={16} />
            </button>
          </form>
        </section>
        <section className="surface-card">
          <span className="pill">CURRENT MACHINE</span>
          <h2>{automaton.name}</h2>
          <p className="muted">
            Convert an NFA or ε-NFA with subset construction. Minimize a DFA by
            refining state partitions.
          </p>
          <button
            className="button"
            onClick={() =>
              perform(() => {
                pipeline(automaton);
                setDetail("");
              })
            }
          >
            Inspect current machine <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {!!stages.length && (
        <section className="pipeline-section">
          <div className="section-title">
            <h2>The conversion pipeline</h2>
            <span className="muted">
              Each stage recognizes the same language
            </span>
          </div>
          <div className="pipeline-grid">
            {stages.map((stage, i) => (
              <article
                className="surface-card pipeline-card"
                key={`${stage.title}-${i}`}
              >
                <span className="eyebrow">
                  STAGE {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{stage.title}</h3>
                <p>
                  {stage.machine.states.length} states ·{" "}
                  {stage.machine.transitions.length} transitions
                </p>
                <details>
                  <summary>Construction trace</summary>
                  <pre>{stage.explanation}</pre>
                </details>
                <details>
                  <summary>Transition table</summary>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>From</th>
                          <th>Input</th>
                          <th>To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stage.machine.transitions.map((t) => (
                          <tr key={t.id}>
                            <td>
                              {
                                stage.machine.states.find(
                                  (s) => s.id === t.from,
                                )?.label
                              }
                            </td>
                            <td>{"symbol" in t ? t.symbol : ""}</td>
                            <td>
                              {
                                stage.machine.states.find((s) => s.id === t.to)
                                  ?.label
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                <button
                  className="button"
                  onClick={() => {
                    setAutomaton(stage.machine);
                    onOpenEditor();
                  }}
                >
                  Open in editor <ArrowUpRight size={14} />
                </button>
              </article>
            ))}
          </div>
          {detail && (
            <details className="surface-card">
              <summary>Inspect the parsed expression (AST)</summary>
              <pre>{detail}</pre>
            </details>
          )}
        </section>
      )}
      <section className="surface-card intersection-card">
        <div>
          <span className="pill">
            <GitMerge size={13} /> FORMAL PRODUCT
          </span>
          <h2>Find the language intersection</h2>
          <p className="muted">
            Combine the current finite automaton with a saved machine. The
            result accepts a string only when both inputs accept it. NFA inputs
            are determinized first.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            perform(() => {
              const other = library.find(
                (e) => e.machine.id === second,
              )?.machine;
              if (!other)
                throw new Error(
                  "Save a second finite machine to your library, then choose it here.",
                );
              if (
                automaton.type === "PDA" ||
                automaton.type === "TM" ||
                other.type === "PDA" ||
                other.type === "TM"
              )
                throw new Error(
                  "Product construction supports DFA, NFA and ε-NFA inputs.",
                );
              const machine = productIntersection(automaton, other);
              setStages([
                {
                  title: "Product DFA",
                  machine,
                  explanation:
                    "Reachable pairs of states. A pair accepts exactly when both constituent states accept.",
                },
              ]);
              setDetail("");
            });
          }}
        >
          <label>
            Second machine
            <select value={second} onChange={(e) => setSecond(e.target.value)}>
              <option value="">Choose from your library</option>
              {library
                .filter((e) => !["PDA", "TM"].includes(e.machine.type))
                .map((e) => (
                  <option key={e.machine.id} value={e.machine.id}>
                    {e.machine.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="button" type="submit">
            Construct intersection <ArrowRight size={15} />
          </button>
        </form>
      </section>
    </main>
  );
}

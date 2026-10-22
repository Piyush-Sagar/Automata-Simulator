"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Check,
  CircleHelp,
  Download,
  FolderOpen,
  GitBranch,
  Layers3,
  Menu,
  Plus,
  Save,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import { AutomataCanvas } from "./editor/AutomataCanvas";
import { EditorToolbar } from "./editor/EditorToolbar";
import { PropertiesPanel } from "./editor/PropertiesPanel";
import {
  TransitionDialog,
  type TransitionDraft,
} from "./editor/TransitionDialog";
import {
  SimulationControls,
  runCurrentMachine,
} from "./simulator/SimulationControls";
import { ConversionWorkbench } from "./conversion/ConversionWorkbench";
import { Dialog } from "./ui/Dialog";
import { useAutomataStore } from "../store/automataStore";
import { useSimulationStore } from "../store/simulationStore";
import { usePreferencesStore, type Settings } from "../store/preferencesStore";
import { emptyMachine, loadTemplate, templateInfo } from "../engine/templates";
import type { AutomatonType } from "../engine/types";
import {
  parseAutomatonJson,
  serializeAutomaton,
} from "../engine/common/serialization";
import { validateAutomaton } from "../engine/common/validation";
import { writeDraft, downloadText, STORAGE_KEYS } from "../lib/storage";

export type StudioView = "editor" | "simulator" | "convert" | "saved";
type Modal =
  "templates" | "settings" | "new" | "help" | "export" | "transition" | null;
export function Studio({ view = "editor" }: { view?: StudioView }) {
  const router = useRouter();
  const a = useAutomataStore();
  const preferences = usePreferencesStore();
  const [modal, setModal] = useState<Modal>(null),
    [transition, setTransition] = useState<TransitionDraft>({});
  const [inspector, setInspector] = useState(false);
  const [exporting, setExporting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const onTransition = useCallback((draft: TransitionDraft) => {
    setTransition(draft);
    setModal("transition");
  }, []);
  const openEditor = () => router.push("/editor");
  useEffect(() => {
    usePreferencesStore.getState().initialize();
    let timer: ReturnType<typeof setTimeout>;
    let dirty = false;
    const flush = () => {
      if (!dirty) return;
      try {
        writeDraft(useAutomataStore.getState().automaton);
        dirty = false;
      } catch {
        usePreferencesStore
          .getState()
          .notify("Autosave failed. Export JSON to keep a copy of your work.");
      }
    };
    const unsubscribe = useAutomataStore.subscribe((s, previous) => {
      if (s.automaton === previous.automaton) return;
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(flush, 350);
    });
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      clearTimeout(timer);
      unsubscribe();
      flush();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        preferences.settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : preferences.settings.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.settings.theme]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.querySelector("dialog[open]") ||
        (e.target instanceof HTMLElement &&
          (e.target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)))
      )
        return;
      const state = useAutomataStore.getState(),
        sim = useSimulationStore.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        usePreferencesStore.getState().save();
      } else if (view === "editor" || view === "simulator") {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          if (state.selectedNodes.length || state.selectedEdges.length)
            state.deleteSelected();
        } else if (e.code === "Space") {
          e.preventDefault();
          if (!sim.simulationResult) runCurrentMachine();
          else sim.setIsPlaying(!sim.isPlaying);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          sim.stepForward();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          sim.stepBackward();
        } else if (e.key.toLowerCase() === "r") sim.resetSimulation();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);
  async function exportImage(format: "png" | "svg") {
    const target = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!target || !a.automaton.states.length) {
      preferences.notify(
        "Open a machine with states in the editor before exporting an image.",
      );
      return;
    }
    setExporting(true);
    try {
      const { toPng, toSvg } = await import("html-to-image");
      const boxes = [
        ...a.automaton.states.map((s) => ({
          x: s.x - 40,
          y: s.y,
          width: 116,
          height: 76,
        })),
        ...Array.from(
          target.querySelectorAll<SVGGraphicsElement>(".react-flow__edge-path"),
        ).map((path) => path.getBBox()),
      ];
      const minX = Math.min(...boxes.map((b) => b.x)) - 60,
        minY = Math.min(...boxes.map((b) => b.y)) - 60;
      const width = Math.max(
          600,
          Math.max(...boxes.map((b) => b.x + b.width)) - minX + 60,
        ),
        height = Math.max(
          400,
          Math.max(...boxes.map((b) => b.y + b.height)) - minY + 60,
        );
      if (width * height > 6_000_000)
        throw new Error(
          "This graph is too large for image export. Use Arrange states to compact the layout first.",
        );
      const url = await (format === "png" ? toPng : toSvg)(target, {
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--canvas")
          .trim(),
        width,
        height,
        pixelRatio: 2,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${-minX}px, ${-minY}px) scale(1)`,
        },
        filter: (node) =>
          !(node instanceof Element) ||
          !node.classList.contains("react-flow__handle"),
      });
      const blob = await (await fetch(url)).blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${a.automaton.name}.${format}`;
      link.href = objectUrl;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setModal(null);
      preferences.notify(`${format.toUpperCase()} image exported.`);
    } catch (error) {
      preferences.notify(
        error instanceof Error ? error.message : "Image export failed.",
      );
    } finally {
      setExporting(false);
    }
  }
  const nav = [
    { id: "editor", href: "/editor", title: "Editor", Icon: GitBranch },
    { id: "simulator", href: "/simulator", title: "Simulator", Icon: Activity },
    { id: "convert", href: "/convert", title: "Convert", Icon: Layers3 },
    { id: "saved", href: "/saved", title: "Library", Icon: FolderOpen },
  ];
  const DocumentTitle = view === "editor" || view === "simulator" ? "h1" : "p";
  return (
    <div className="studio-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <header className="app-header">
        <Link
          className="brand"
          href="/editor"
          aria-label="Automata Studio home"
        >
          <span className="brand-mark">
            <GitBranch size={22} />
          </span>
          <span>automata</span>
          <span className="brand-sub">Studio</span>
        </Link>
        <nav aria-label="Main navigation">
          {nav.map(({ id, href, title, Icon }) => (
            <Link
              key={id}
              href={href}
              className={view === id ? "active" : ""}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              {title}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            title="How this works"
            aria-label="How this works"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={19} />
          </button>
          <button
            className="icon-button"
            title="Settings"
            aria-label="Settings"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={19} />
          </button>
          <button
            className="button"
            aria-label="Examples"
            title="Examples"
            onClick={() => setModal("templates")}
          >
            <Boxes size={16} />
            <span>Examples</span>
          </button>
        </div>
      </header>
      <div className="document-bar">
        <div className="document-title">
          <DocumentTitle>
            {a.automaton.name || "Untitled machine"}
          </DocumentTitle>
          <span className="pill">
            {a.automaton.type === "ENFA" ? "ε-NFA" : a.automaton.type}
          </span>
          <span className="autosave">
            <Check size={12} />
            Saved locally
          </span>
        </div>
        <div className="document-actions">
          <button className="button subtle" onClick={() => setModal("new")}>
            <Plus size={15} />
            New
          </button>
          <button
            className="button subtle"
            onClick={() => input.current?.click()}
          >
            <Upload size={15} />
            Import
          </button>
          <button className="button subtle" onClick={() => setModal("export")}>
            <Download size={15} />
            Export
          </button>
          <button className="button" onClick={preferences.save}>
            <Save size={15} />
            Save
          </button>
          {(view === "editor" || view === "simulator") && (
            <button
              id="inspector-toggle"
              className="icon-button inspector-toggle"
              aria-label="Toggle inspector"
              aria-expanded={inspector}
              aria-controls="machine-inspector"
              onClick={() => setInspector(!inspector)}
            >
              <Menu size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        aria-label="Import automaton JSON"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 2_000_000)
              throw new Error("JSON files must be under 2 MB.");
            const machine = parseAutomatonJson(await file.text());
            const errors = validateAutomaton(machine);
            if (errors.length)
              throw new Error(errors.map((e) => e.message).join(" "));
            a.setAutomaton(machine);
            preferences.notify(`Imported “${machine.name}”.`);
            openEditor();
          } catch (error) {
            preferences.notify(
              error instanceof Error ? error.message : "Could not import file.",
            );
          } finally {
            e.target.value = "";
          }
        }}
      />
      {preferences.notice && (
        <div className="notice-bar" role="status">
          <span>{preferences.notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => preferences.notify("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <div id="workspace" className="workspace" tabIndex={-1}>
        {view === "convert" ? (
          <ConversionWorkbench onOpenEditor={openEditor} />
        ) : view === "saved" ? (
          <LibraryView onOpenEditor={openEditor} />
        ) : (
          <ReactFlowProvider>
            <div className="editor-surface">
              <div className="editor-main">
                <EditorToolbar
                  onTransition={() => onTransition({})}
                  onConvert={() => router.push("/convert")}
                />
                <div className="canvas-heading">
                  <span>
                    {a.automaton.states.length} states{" "}
                    <span className="muted">/</span>{" "}
                    {a.automaton.transitions.length} transitions
                  </span>
                </div>
                <main className="canvas-area" aria-label="Automata graph">
                  <AutomataCanvas onTransition={onTransition} />
                </main>
              </div>
              <div
                id="machine-inspector"
                className={inspector ? "inspector-wrap open" : "inspector-wrap"}
              >
                <PropertiesPanel
                  onTransition={onTransition}
                  onClose={() => {
                    setInspector(false);
                    document.getElementById("inspector-toggle")?.focus();
                  }}
                />
              </div>
            </div>
            <SimulationControls />
          </ReactFlowProvider>
        )}
      </div>
      <footer className="app-footer">
        <span>
          <span className="status-dot" />
          All computation stays in your browser
        </span>
        <button className="text-button" onClick={() => setModal("help")}>
          <BookOpen size={13} />
          Guide & shortcuts
        </button>
      </footer>
      {modal === "transition" && (
        <TransitionDialog draft={transition} onClose={() => setModal(null)} />
      )}
      {modal === "templates" && (
        <Dialog
          title="Start with a working example"
          wide
          onClose={() => setModal(null)}
        >
          <p className="muted">
            Real machines, ready to explore. Loading an example can be undone.
          </p>
          <div className="template-grid">
            {templateInfo.map((t) => (
              <button
                className="template-card"
                key={t.id}
                onClick={() => {
                  a.setAutomaton(loadTemplate(t.id));
                  useSimulationStore.getState().setInputString(t.sample);
                  setModal(null);
                  openEditor();
                }}
              >
                <span className="pill">
                  {t.type === "ENFA" ? "ε-NFA" : t.type}
                </span>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <span className="template-link">
                  Explore example <ArrowUpRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {modal === "settings" && (
        <SettingsDialog onClose={() => setModal(null)} />
      )}
      {modal === "new" && (
        <Dialog title="Create a machine" onClose={() => setModal(null)}>
          <p className="muted">
            Choose a model. Your current machine remains available through Undo.
            Save it to the library to keep it across sessions.
          </p>
          <div className="machine-types">
            {(["DFA", "NFA", "ENFA", "PDA", "TM"] as AutomatonType[]).map(
              (type) => (
                <button
                  className="button"
                  key={type}
                  onClick={() => {
                    a.setAutomaton(emptyMachine(type));
                    setModal(null);
                    openEditor();
                  }}
                >
                  {type === "ENFA" ? "ε-NFA" : type}
                  <ArrowRightIcon />
                </button>
              ),
            )}
          </div>
        </Dialog>
      )}
      {modal === "help" && <GuideDialog onClose={() => setModal(null)} />}
      {modal === "export" && (
        <Dialog title="Export your machine" onClose={() => setModal(null)}>
          <div className="form-stack">
            <p className="muted">
              JSON preserves the editable machine. Images export the full graph
              using your current theme.
            </p>
            <button
              className="button primary"
              onClick={() => {
                downloadText(
                  serializeAutomaton(a.automaton),
                  `${a.automaton.name}.json`,
                );
                setModal(null);
              }}
            >
              Download JSON
            </button>
            <button
              className="button"
              disabled={exporting || !["editor", "simulator"].includes(view)}
              onClick={() => void exportImage("png")}
            >
              {exporting ? "Exporting…" : "Download PNG"}
            </button>
            <button
              className="button"
              disabled={exporting || !["editor", "simulator"].includes(view)}
              onClick={() => void exportImage("svg")}
            >
              {exporting ? "Exporting…" : "Download SVG"}
            </button>
            {!["editor", "simulator"].includes(view) && (
              <p className="muted">Open the editor to export a graph image.</p>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={15} />;
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = usePreferencesStore();
  const [draft, setDraft] = useState(settings);
  return (
    <Dialog title="Workspace settings" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          updateSettings(draft);
          onClose();
        }}
      >
        <label>
          Appearance
          <select
            value={draft.theme}
            onChange={(e) =>
              setDraft({ ...draft, theme: e.target.value as Settings["theme"] })
            }
          >
            <option value="system">Follow system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <p className="muted">
          Execution budgets keep cyclic and nondeterministic machines
          responsive. Reaching a budget reports TIMEOUT; it does not prove
          rejection.
        </p>
        {(
          [
            { key: "maxSteps", label: "Maximum steps", min: 1, max: 10000 },
            {
              key: "maxInputLength",
              label: "Maximum input length",
              min: 0,
              max: 10000,
            },
            {
              key: "maxConfigurations",
              label: "PDA configuration budget",
              min: 1,
              max: 20000,
            },
            {
              key: "maxStackDepth",
              label: "PDA maximum stack depth",
              min: 1,
              max: 1000,
            },
          ] as const
        ).map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              required
              min={field.min}
              max={field.max}
              value={draft[field.key]}
              onChange={(e) =>
                setDraft({ ...draft, [field.key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <button className="button primary">Save settings</button>
      </form>
    </Dialog>
  );
}

function LibraryView({ onOpenEditor }: { onOpenEditor: () => void }) {
  const p = usePreferencesStore();
  const [renameId, setRenameId] = useState<string | null>(null),
    [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  return (
    <main className="content-page">
      <div className="page-intro">
        <h1>Saved machines</h1>
        <p>Machines saved in this browser.</p>
      </div>
      {!p.libraryReadable ? (
        <div className="surface-card">
          <p className="error-box">
            The saved library is unreadable. Its original data has been
            preserved, and saving to it is blocked to prevent data loss.
          </p>
          <button
            className="button"
            onClick={() =>
              downloadText(
                localStorage.getItem(STORAGE_KEYS.library) ?? "",
                "automata-library-recovery.json",
              )
            }
          >
            Download library data for recovery
          </button>
        </div>
      ) : !p.library.length ? (
        <div className="library-empty surface-card">
          <FolderOpen size={38} />
          <h2>Your library is ready.</h2>
          <p>Use Save in the editor to add your first machine.</p>
          <button className="button primary" onClick={onOpenEditor}>
            Go to editor <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <div className="library-grid">
          {p.library.map(({ machine, savedAt }) => (
            <article className="surface-card" key={machine.id}>
              <span className="pill">{machine.type}</span>
              <h2>{machine.name}</h2>
              <p className="muted">
                {machine.states.length} states · {machine.transitions.length}{" "}
                transitions
              </p>
              <p className="field-help">
                Saved {new Date(savedAt).toLocaleString()}
              </p>
              <div className="library-actions">
                <button
                  className="button primary"
                  onClick={() => {
                    useAutomataStore.getState().setAutomaton(machine);
                    onOpenEditor();
                  }}
                >
                  Open <ArrowUpRight size={14} />
                </button>
                <button
                  className="button"
                  onClick={() => p.duplicateSaved(machine.id)}
                >
                  Duplicate
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setRenameId(machine.id);
                    setName(machine.name);
                  }}
                >
                  Rename
                </button>
                <button
                  className="text-button danger"
                  onClick={() => setDeleteId(machine.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {renameId && (
        <Dialog title="Rename saved machine" onClose={() => setRenameId(null)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              p.renameSaved(renameId, name);
              setRenameId(null);
            }}
          >
            <label>
              Machine name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="button primary">Rename</button>
          </form>
        </Dialog>
      )}
      {deleteId && (
        <Dialog title="Delete saved machine?" onClose={() => setDeleteId(null)}>
          <p>
            This removes the library entry. Export JSON first if you want a
            backup.
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={() => setDeleteId(null)}>
              Cancel
            </button>
            <button
              className="button danger"
              onClick={() => {
                p.removeSaved(deleteId);
                setDeleteId(null);
              }}
            >
              Delete from library
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

function GuideDialog({ onClose }: { onClose: () => void }) {
  const a = useAutomataStore((s) => s.automaton),
    sim = useSimulationStore();
  const step = sim.simulationResult?.steps[sim.currentStepIndex];
  return (
    <Dialog title="How this works" wide onClose={onClose}>
      <div className="guide-grid">
        <section>
          <h3>Build → run → inspect</h3>
          <ol>
            <li>
              Add states. The first state is the start; use the inspector to
              change it.
            </li>
            <li>
              Mark accepting states in the inspector. A double circle means
              accepting.
            </li>
            <li>
              Drag from the bottom handle of one state to the top of another, or
              use Transition to choose states with the keyboard.
            </li>
            <li>
              Choose the transition rule. A self-loop uses the same source and
              destination.
            </li>
            <li>
              Enter input, run, and click any trace row to inspect its exact
              configuration.
            </li>
          </ol>
          <h3>Current configuration</h3>
          <p>
            {a.type} ·{" "}
            {step
              ? `Step ${step.step}: {${step.activeStates.map((id) => a.states.find((s) => s.id === id)?.label).join(", ")}}`
              : "Run a machine to inspect its configurations."}
          </p>
        </section>
        <section>
          <h3>The models</h3>
          <dl>
            <dt>DFA</dt>
            <dd>
              One active state and at most one transition per symbol. Missing
              rules reject.
            </dd>
            <dt>NFA / ε-NFA</dt>
            <dd>
              Follow every possible branch. ε-closure includes all states
              reachable without reading input. Any accepting branch accepts
              after all input is consumed.
            </dd>
            <dt>PDA</dt>
            <dd>
              Configurations contain a state, input position and stack. Rules
              pop a matching top symbol and push a replacement. The explorer
              displays every reachable configuration at a breadth-first step.
            </dd>
            <dt>Turing machine</dt>
            <dd>
              Read one tape cell, write a symbol, and move the head. The tape
              extends in both directions. Accept/reject states halt immediately.
            </dd>
          </dl>
        </section>
        <section>
          <h3>Conversions</h3>
          <p>
            Thompson construction assembles an ε-NFA from the parsed regex.
            Subset construction makes each reachable set of NFA states a DFA
            state. Moore refinement merges states with indistinguishable
            futures; missing transitions are completed with a rejecting sink.
            Product construction recognizes language intersection.
          </p>
        </section>
        <section>
          <h3>Keyboard shortcuts</h3>
          <dl className="shortcuts">
            <dt>Ctrl / ⌘ + Z</dt>
            <dd>Undo</dd>
            <dt>Ctrl / ⌘ + Shift + Z</dt>
            <dd>Redo</dd>
            <dt>Ctrl / ⌘ + S</dt>
            <dd>Save to library</dd>
            <dt>Delete</dt>
            <dd>Delete selection</dd>
            <dt>Space</dt>
            <dd>Run or play/pause</dd>
            <dt>← / →</dt>
            <dd>Previous / next step</dd>
            <dt>R</dt>
            <dd>Reset playback</dd>
          </dl>
          <p className="muted">
            Shortcuts are inactive while typing or using a dialog. TIMEOUT means
            a resource budget was reached; acceptance remains unknown.
          </p>
        </section>
      </div>
    </Dialog>
  );
}

# Current handoff — Automata Studio

Updated 2026-10-22 after the user's request to complete the project.

The implementation now covers the remaining scope reconstructed from the original
handoff. The original 43-section specification was not supplied to this chat;
`docs/HANDOFF-original.md` preserves the earlier OpenCode handoff verbatim.
The latest user request authorized completing all remaining phases together.

## Implemented

- DFA/NFA/ε-NFA engine validation and simulation; actual destination-state and
  ε-closure highlighting, including real ε-transition IDs.
- Complete subset construction, ε-removal and mathematically correct minimization
  of partial machines using a rejecting sink and Moore partition refinement.
- Regex tokenizer, AST, Thompson construction and inspectable conversion stages.
- Nondeterministic PDA BFS, complete-input acceptance, real stack configurations,
  cycle detection, depth/configuration/memory/work budgets.
- Sparse-tape TM, L/R/S, negative cells, real tape snapshots, accept/reject/missing
  rule halting, step and memory budgets.
- DFA/NFA/ε-NFA formal intersection products, including differing alphabets.
- Typed transition creation/editing from graph drags or accessible forms, curved
  parallel edges, self-loops, reliable selection, positions and automatic fitting.
- Complete paginated execution traces, playback, stack selector and tape display.
- Machine properties, finite model switching, configurable limits, theme settings,
  keyboard shortcuts, 100-entry history and drag coalescing.
- Autosave with reload/navigation flush, library operations, validated JSON
  import/export, PNG/SVG graph download and corrupted-library recovery download.
- Six real templates, educational guide, responsive themes, reduced motion,
  meaningful application metadata, README and formatting commands.
- Routes: `/editor`, `/simulator`, `/convert`, `/saved`, and `/` redirects to editor.

The two old standalone conversion/minimization modals have been replaced by the
conversion workspace. The handoff's PDA example was corrected: `01` belongs to
`0ⁿ1ⁿ`. The pre-existing lint/type repairs were preserved in the updated code.

## Important decisions

See PLAN.md and README.md for conventions and limits. In particular:

- Single Unicode code points are input symbols; ε consumes no input.
- Partial DFAs are allowed; conversion/minimization complete them with a sink.
- PDA replacement arrays are bottom-to-top, rightmost on top. Empty stacks have
  no applicable top-matching rule. Acceptance requires complete input.
- Product means language intersection; nondeterministic inputs are determinized.
- TM work symbols may differ from the input alphabet; blank is outside it.
- SVG export uses foreignObject; JSON is the editable interchange format.
- Browser-local storage has no cloud sync; origins/ports have separate libraries.
- TIMEOUT indicates unknown acceptance, never a proven rejection.

## Working tree and development

All work is local and uncommitted. No changes were discarded, no commits were
created, and no remote or deployment was configured. The original branch is main.
Prettier was added as a development dependency. Vitest config is now
`vitest.config.mts`, eliminating the former CommonJS/ESM advisory.

Tested runtime: Node 24.18.1, pnpm 11.20.0. No environment variables or services.
Run `pnpm dev`, or `pnpm build` followed by `pnpm start` for production.

## Verification

See docs/VERIFICATION.md for actual checks, browser scenarios and screenshots.
No remaining core feature is intentionally a placeholder. Budgets limit large
machines and regexes; testing is educational-scale rather than exhaustive formal
verification. The original specification remains available only through the
historical summary, so undocumented requirements cannot be claimed as verified.

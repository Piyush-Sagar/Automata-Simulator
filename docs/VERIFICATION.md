# Verification — 2026-10-22

## Automated checks

- `pnpm test`: **10 files, 99 tests passed**.
- `pnpm lint`: clean.
- `pnpm typecheck`: clean.
- `pnpm format:check`: clean.
- `pnpm build`: production routes successfully compiled and prerendered.
- `git diff --check`: no whitespace errors (Windows line-ending advisories only).

Runtime: Node 24.18.1 and pnpm 11.20.0. The Vitest configuration uses `.mts` and
no longer emits the original ESM/CommonJS advisory.

The test suite checks languages across all binary strings through length 5 for
seven regexes, comparing the native test oracle with Thompson ε-NFA, ε-removal,
subset construction and minimization. Product tests compare all binary inputs
through length 6. Other tests exercise PDA acceptance modes, cycles, bounded
exploration, TM tape writes, negative/stationary head movement, explicit rejection,
non-halting timeouts, malformed machines, Unicode, history and storage failures.

## Browser scenarios

Tested using the in-app Chromium browser. Development app: 127.0.0.1:3000.
Production app: 127.0.0.1:3001. The app has no API/database boundary; the verified
flow is UI → Zustand → pure engine → trace → graph/stack/tape rendering.

| Scenario                                                 | Observed result                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| DFA `Ends in 01`, input `1101`                           | ACCEPTED, final state q2; clickable final trace highlights q2                                                 |
| Duplicate DFA transition                                 | Rejected inline with the conflicting state and symbol                                                         |
| Drag NFA q1 bottom handle to q0 top handle               | Transition form opens with q1/q0 preselected; cancellation creates no rule                                    |
| New ε-NFA, two states, ε rule, q1 accepting, empty input | ACCEPTED; q0 and q1 both highlighted as the initial ε-closure                                                 |
| Regex `(a\|b)*abb` pipeline                              | Inspectable ε-NFA, NFA, DFA and minimized DFA; generated DFA accepts `aabb`                                   |
| PDA `0ⁿ1ⁿ`, input `0011`                                 | ACCEPTED; configuration at step 2 contains stack ZAA, shown top-first as A/A/Z                                |
| TM bit flip, input `10110`                               | ACCEPTED; trace advances head and shows the actual tape cells                                                 |
| Save/load and library                                    | Machines saved and opened; several entries remain available for product selection                             |
| Immediate reload after renaming draft                    | Latest name and graph restored, including edits within the debounce window                                    |
| JSON round trip                                          | Downloaded JSON re-imports with an explicit success notification                                              |
| PNG / SVG                                                | Both produce actual downloadable files; PNG visually inspected for labels, edges, start arrow and accept ring |
| Intersection of `Contains 101` and `Ends in 01`          | Product has 8 states/16 rules; loaded in editor and accepts `101`                                             |
| Appearance                                               | Light and system/dark rendering inspected; settings persist through reload                                    |
| Production playback                                      | NFA input `1001` automatically advances to configuration 4/4 with q0 and q2 active                            |
| Responsive inspector                                     | Accessible toggle exposes full properties on mobile                                                           |
| Resize from desktop to mobile                            | At 375 CSS pixels, node horizontal ranges are 43–91, 163–212 and 284–332; all fit                             |
| Mobile document width                                    | scrollWidth equals clientWidth (375); no horizontal page overflow                                             |
| Production browser console                               | No error or warning entries in the checked flow                                                               |

Desktop layouts were inspected at the normal browser size and a 1440×1000
viewport override. Mobile was inspected with a 390×844 override (375 CSS pixels
of usable content after the scrollbar). Temporary overrides were reset.

## Issues found and repaired during verification

- Repeated Add State actions placed nodes on top of one another: additions now
  avoid existing state positions.
- Autosave could miss the last edit before refresh: dirty drafts now flush on
  pagehide/beforeunload and explicit Save.
- Saving before initialization could restore an old draft: library initialization
  during Save now preserves the current document.
- Data-URL image downloads were not delivered in the app browser: generated image
  data now downloads through a Blob URL.
- A mobile navigation row overflowed by 5 pixels: compact spacing fixes it.
- The icon-only mobile Examples control lost its accessible name: it now has an
  explicit accessible label.
- Resize fitting depended on React Flow's visibility-gated dimensions: the canvas
  now observes its own size and computes a viewport from actual geometry.

## Screenshots

- [Production editor](screenshots/editor-desktop.jpg)
- [Mobile layout](screenshots/editor-mobile.jpg)

## Practical limits

These are manual checks in one Chromium environment plus automated engine/store
tests, not exhaustive browser or formal verification. PNG/SVG export has a finite
pixel budget. SVG contains foreignObject and is intended as an image; JSON is the
editable format. Execution is bounded and synchronous, suitable for educational
machines. No cloud synchronization or hosted deployment is configured.

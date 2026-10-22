# Automata Studio interface

The UI/UX Pro Max minimalism and developer-tool recommendations inform this
workspace. Its landing-page suggestions do not apply to an interactive editor.

- Use neutral surfaces, a green action color, clear borders, and restrained shadows.
- Use the system sans-serif for the interface and monospace for machine symbols.
  Keep fonts local so the editor works without external font requests.
- Keep the workspace central: graph, properties, then simulation. Group secondary
  actions and use a segmented navigation control with an explicit current page.
- Use plain, functional text. Do not add slogans or decorative marketing sections.
- Reserve solid green for the main Run action. Use tinted or outlined controls for
  editing, navigation, and secondary actions.
- Keep spacing on a 4/8px scale. Panels use 12px corners and controls use 8px corners.
- Provide hover, pressed, disabled, and visible keyboard-focus states. Icons that
  accompany text are decorative; standalone icon buttons need accessible labels.
- Pair light and dark theme tokens in `src/app/globals.css`. Normal text needs at
  least 4.5:1 contrast, including muted text.
- The simulation slider uses the existing execution trace. Keyboard arrows, Home,
  and End must update the highlighted configuration and graph without autoplay.
- Below 900px, show properties in an optional drawer with an explicit close button.
  Below 640px, wrap tools and keep input and navigation readable without page overflow.
- Limit motion to short state feedback and dialog entry. Respect reduced motion.

These are the project-specific selections from the skill, adapted to a desktop
web tool. Mobile native-app rules and suggested marketing layouts are excluded.

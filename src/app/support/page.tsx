import { InfoPage } from "@/components/InfoPage";

export default function SupportPage() {
  return (
    <InfoPage title="Support">
      <p>
        Automata Studio is an educational automata editor and simulator
        maintained by Piyush Sagar.
      </p>
      <p>
        Report reproducible problems or request improvements in the{" "}
        <a
          href="https://github.com/Piyush-Sagar/Automata-Simulator/issues"
          style={{ color: "var(--accent)" }}
        >
          GitHub issue tracker
        </a>
        . Include the model type, a small non-sensitive machine or regex, the
        test input, expected behavior and observed result. The tracker is
        public; never include API keys or confidential information.
      </p>
      <h2>Common questions</h2>
      <p>
        <strong>TIMEOUT:</strong> the execution budget was reached. Increase
        limits within the supported bounds or simplify the machine. This result
        does not prove rejection.
      </p>
      <p>
        <strong>Saved machines:</strong> browser libraries belong to a browser
        and origin. The API server cannot read them. Export and import JSON to
        transfer a machine.
      </p>
      <p>
        <strong>ChatGPT connection:</strong> invoke a connected Automata Studio
        tool. Public tools compute results without a shared saved library.
        Server availability and your ChatGPT workspace&apos;s plugin settings
        affect access.
      </p>
      <p>
        <strong>Regex grammar:</strong> union, concatenation, repetition,
        groups, ε and ∅ are supported. Whitespace is literal. Character classes,
        anchors and wildcards are not regex operators in this educational
        grammar.
      </p>
      <p>
        The{" "}
        <a
          href="https://github.com/Piyush-Sagar/Automata-Simulator/blob/main/docs/API.md"
          style={{ color: "var(--accent)" }}
        >
          API guide
        </a>{" "}
        contains the operation catalog and setup instructions.
      </p>
    </InfoPage>
  );
}

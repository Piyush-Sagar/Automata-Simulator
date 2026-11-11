import { InfoPage } from "@/components/InfoPage";

export default function TermsPage() {
  return (
    <InfoPage title="Terms of use">
      <p>
        Automata Studio is maintained by Piyush Sagar for learning and
        experimenting with Theory of Computation. Last updated November 11,
        2026.
      </p>
      <h2>Educational scope</h2>
      <p>
        The service simulates supported machine models within explicit resource
        budgets. It is not a formal proof assistant, an exhaustive equivalence
        checker or a guarantee of correctness for arbitrary machines. A TIMEOUT
        result is inconclusive; it does not prove rejection or non-halting.
        Check important results independently.
      </p>
      <h2>Responsible use</h2>
      <p>
        Use the documented interfaces and execution limits. Do not attempt to
        access another person&apos;s data, bypass authentication, overload the
        service or submit material you are not entitled to share. You remain
        responsible for the content you submit and how you use the results.
      </p>
      <h2>Availability and saved work</h2>
      <p>
        This educational service may change or become unavailable. Keep exported
        JSON backups of work you want to retain. Browser storage and separately
        configured server storage are different, and the public plugin does not
        provide a shared saved library.
      </p>
      <h2>Source and third-party services</h2>
      <p>
        The public repository contains the project source. Publication of this
        service does not grant a source-code license; consult the repository for
        its current licensing status. ChatGPT and hosting providers have their
        own terms and privacy policies. This project does not offer payments or
        purchases.
      </p>
      <p>
        For support, visit the{" "}
        <a
          href="https://github.com/Piyush-Sagar/Automata-Simulator/issues"
          style={{ color: "var(--accent)" }}
        >
          project issue tracker
        </a>
        .
      </p>
    </InfoPage>
  );
}

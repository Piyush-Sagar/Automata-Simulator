import { InfoPage } from "@/components/InfoPage";

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy">
      <p>
        Automata Studio is an educational project maintained by Piyush Sagar.
        This page describes the application&apos;s data handling. Last updated
        November 11, 2026.
      </p>
      <h2>Browser editor</h2>
      <p>
        The editor saves its draft, named machines and preferences in your
        browser&apos;s local storage. Those records stay in that browser and
        origin unless you export them or send them to an API. The browser editor
        does not automatically synchronize its library to the server.
      </p>
      <h2>Public API and ChatGPT tools</h2>
      <p>
        When you invoke an API or ChatGPT tool, the machine, input string,
        regular expression and other supplied parameters are sent to the service
        for processing. Public computational operations are stateless:
        application code does not save those request bodies to the machine
        library. Tool results are returned to the calling client. ChatGPT
        handles conversations and tool activity under its own privacy policy.
      </p>
      <h2>Optional private server storage</h2>
      <p>
        A separately configured server can save machines, a draft and
        preferences when protected by an API key. The key grants access to that
        server&apos;s entire single-owner library. Private storage is not
        enabled for the anonymous public plugin. Server operators control their
        storage and backups.
      </p>
      <h2>Infrastructure and sensitive content</h2>
      <p>
        Hosting and network providers process requests and may retain
        operational logs under their own policies. This project does not specify
        a separate infrastructure log-retention period. Do not submit
        credentials, personal records or confidential information as machine
        labels, regex input or test strings. No advertising or analytics SDK is
        included in the application.
      </p>
      <h2>Requests and questions</h2>
      <p>
        You can remove browser records through your browser&apos;s site-data
        controls. For project questions, use the{" "}
        <a
          href="https://github.com/Piyush-Sagar/Automata-Simulator/issues"
          style={{ color: "var(--accent)" }}
        >
          GitHub issue tracker
        </a>
        . Issues are public: do not post sensitive information or access keys.
      </p>
    </InfoPage>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export function InfoPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main
      className="project-info"
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "48px 24px",
        fontSize: 16,
        lineHeight: 1.7,
      }}
    >
      <Link
        href="/editor"
        style={{
          color: "var(--accent)",
          display: "inline-block",
          padding: "10px 0",
        }}
      >
        ← Automata Studio
      </Link>
      <h1 style={{ fontSize: 34, lineHeight: 1.2, margin: "24px 0" }}>
        {title}
      </h1>
      {children}
      <nav
        aria-label="Project information"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          borderTop: "1px solid var(--border)",
          paddingTop: 24,
          marginTop: 40,
        }}
      >
        <Link
          href="/support"
          style={{ color: "var(--accent)", padding: "8px 0" }}
        >
          Support
        </Link>
        <Link
          href="/privacy"
          style={{ color: "var(--accent)", padding: "8px 0" }}
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          style={{ color: "var(--accent)", padding: "8px 0" }}
        >
          Terms
        </Link>
      </nav>
    </main>
  );
}

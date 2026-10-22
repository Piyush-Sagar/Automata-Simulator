import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Automata Studio",
  description:
    "An interactive theory of computation laboratory. Build finite automata, pushdown automata and Turing machines; simulate and inspect real algorithms.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const s=JSON.parse(localStorage.getItem('automata-studio.settings.v1')||'{}');document.documentElement.dataset.theme=s.theme==='dark'||(s.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

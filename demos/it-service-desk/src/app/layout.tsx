import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northstar IT Service Desk",
  description: "A compact enterprise IT service desk demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
    const param = new URLSearchParams(window.location.search).get("scoutTheme");
    const theme =
      param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  })();`,
          }}
        />
      </head>
      <body>
        <header className="site-header">
          <div className="shell header-content">
            <Link className="brand" href="/">
              <span className="brand-mark">N</span>
              <span>
                <strong>Northstar</strong>
                <small>IT Service Desk</small>
              </span>
            </Link>
            <nav aria-label="Primary navigation">
              <Link href="/">Tickets</Link>
              <Link className="button button-primary button-small" href="/tickets/new">
                New ticket
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

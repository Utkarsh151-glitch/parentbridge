import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { FlaskConical } from "lucide-react";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ParentBridge · Agentic AI", template: "%s · ParentBridge" },
  description:
    "A multilingual agentic AI project for education support, with tool orchestration, grounded matching, human review, and safety checks.",
};

export const viewport: Viewport = { themeColor: "#3b3fb5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="indic min-h-full flex flex-col bg-background text-foreground">
        <div role="note" className="bg-amber-100 text-amber-950 text-center text-xs sm:text-sm px-4 py-1.5 flex items-center justify-center gap-1.5">
          <FlaskConical className="size-3.5 shrink-0" aria-hidden />
          <span>
            <strong>Demo data</strong> — all families and parents are synthetic.
          </span>
        </div>
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4" aria-label="Main">
            <Link href="/" className="mr-auto flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground text-sm" aria-hidden>
                PB
              </span>
              <span>ParentBridge</span>
            </Link>
            <Link href="/console" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              Console
            </Link>
            <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              Dashboard
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t mt-12">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row gap-2 sm:justify-between">
            <p>
              ParentBridge — an agentic AI portfolio project using a synthetic education support scenario. Consent, purpose limitation, and opt-out are built into the demo.
            </p>
            <p>Next.js · MongoDB Atlas · Gemini · Groq · Twilio WhatsApp · India Post API</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

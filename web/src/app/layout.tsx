import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Antigravity Kit - AI Agent Capability Expansion Toolkit",
  description: "A comprehensive collection of skills, rules, and workflows to supercharge AI coding assistants for Antigravity. 35+ skills, 57 UI Styles, production-ready workflows.",
  metadataBase: new URL("https://antigravity-kit.vercel.app/"),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://antigravity-kit.vercel.app/",
    siteName: "Antigravity Kit",
    images: ["/images/logo.png"],
  },
};

import { LeagueProvider } from "@/context/league-context";
import { AuthProvider } from "@/context/auth-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{ fontFamily: "system-ui, -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, oxygen, ubuntu, cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LeagueProvider>
              {children}
            </LeagueProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

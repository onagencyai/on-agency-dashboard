import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "On Agency | Client Portal",
  description: "AI voice agent performance dashboard",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  const stored = localStorage.getItem('on-agency-theme');
                  if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', '#0a0a0a'); });
                  }
                } catch {}
              `,
            }}
          />
        </head>
        <body
          className={`${inter.variable} antialiased`}
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

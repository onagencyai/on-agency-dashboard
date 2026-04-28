import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "On Agency | Client Portal",
  description: "AI voice agent performance dashboard",
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
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  const stored = localStorage.getItem('on-agency-theme');
                  if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch {}
              `,
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          style={{ background: "var(--bg)", color: "var(--text-primary)", fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

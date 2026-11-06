import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600", "700"] });

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
          <meta name="theme-color" content="#fafafa" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
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
          className={`${inter.variable} antialiased`}
          style={{ background: "#fafafa", color: "var(--text-primary)", fontFamily: "var(--font-body), system-ui, sans-serif" }}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

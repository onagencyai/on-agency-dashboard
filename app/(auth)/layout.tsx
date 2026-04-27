import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  themeColor: "#FAFAFA",
};

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDA Guardrail | AI-Powered Legal Risk Analysis",
  description: "Analyze your NDAs against market standard terms. Identify risks, get suggested fixes, and negotiate with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

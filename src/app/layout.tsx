import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI CRM",
  description: "AI-powered CRM for SMB sales teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

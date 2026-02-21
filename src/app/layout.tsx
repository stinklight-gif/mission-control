import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import AppHeader from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Stock recommendations dashboard"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="min-h-screen bg-slate-950 text-slate-100">
          <AppHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

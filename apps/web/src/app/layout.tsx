import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "../lib/store";
import Nav from "../components/Nav";
import PageTransition from "../components/PageTransition";

export const metadata: Metadata = {
  title: "Cribsearch",
  description: "Evaluate a candidate rental address by its surroundings.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <StoreProvider>
          <Nav />
          <PageTransition>{children}</PageTransition>
        </StoreProvider>
      </body>
    </html>
  );
}

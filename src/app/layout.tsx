import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audora — Stories worth hearing",
  description: "Upload, discover, and listen to audiobooks through semantic search.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

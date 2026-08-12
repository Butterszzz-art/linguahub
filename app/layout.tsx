import type { Metadata } from "next";
import { Quicksand, Fredoka } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LinguaHub",
  description: "A personal language-learning platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream font-sans text-ink">
        <NavBar />
        {children}
      </body>
    </html>
  );
}

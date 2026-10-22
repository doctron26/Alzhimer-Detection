import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Geist } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlzDetect | Multimodal Alzheimer's Early Detection",
  description: "Advanced AI-powered cognitive assessment platform utilizing speech, language, and memory analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jakarta.variable} ${geist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-primary-500/30">
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "../globals.css"; // Ensure globals are loaded for print styles too
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imprimir Tasques - Academia Board",
  description: "Versió per imprimir de les tasques.",
};

export default function PrintLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-white text-black print-container`}
    >
      {children}
    </div>
  );
}

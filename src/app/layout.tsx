import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pub Club - Discover London's Best Pubs",
  description: "Find and explore the best pubs in London with Pub Club. Discover traditional pubs, modern bars, and everything in between with our comprehensive pub directory.",
  keywords: "pubs, London, pub finder, bars, nightlife, London pubs",
  authors: [{ name: "Pub Club" }],
  openGraph: {
    title: "Pub Club - Discover London's Best Pubs",
    description: "Find and explore the best pubs in London with Pub Club.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

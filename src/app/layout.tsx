import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pub Club - Discover London's Best Pubs",
  description: "Find and explore the best pubs in London with Pub Club. Discover traditional pubs, modern bars, and everything in between with our comprehensive pub directory.",
  keywords: "pubs, London, pub finder, bars, nightlife, London pubs, beer garden, traditional pubs, craft beer, pub directory",
  authors: [{ name: "Pub Club" }],
  creator: "Pub Club",
  publisher: "Pub Club",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Pub Club - Discover London's Best Pubs",
    description: "Find and explore the best pubs in London with Pub Club. Discover traditional pubs, modern bars, and everything in between with our comprehensive pub directory.",
    type: "website",
    url: "https://pubclub.co.uk",
    siteName: "Pub Club",
    locale: "en_GB",
    images: [
      {
        url: "https://pubclub.co.uk/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Pub Club - Discover London's Best Pubs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pub Club - Discover London's Best Pubs",
    description: "Find and explore the best pubs in London with Pub Club.",
    images: ["https://pubclub.co.uk/og-image.jpg"],
    creator: "@pubclub",
  },
  alternates: {
    canonical: "https://pubclub.co.uk",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Pub Club",
    "url": "https://pubclub.co.uk",
    "logo": "https://pubclub.co.uk/assets/logo.png",
    "description": "Discover London's best pubs with Pub Club. Find traditional pubs, modern bars, and everything in between with our comprehensive pub directory.",
    "sameAs": [
      "https://twitter.com/pubclub",
      "https://facebook.com/pubclub"
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://pubclub.co.uk",
    "name": "Pub Club",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://pubclub.co.uk/search?q={search_term}",
      "query-input": "required name=search_term"
    }
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema)
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased min-h-screen flex flex-col`}
      >
        <SessionProvider>
          <AnalyticsProvider>
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AnalyticsProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}

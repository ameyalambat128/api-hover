import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "API Hover - See API calls tied to UI interactions",
    template: "%s | API Hover",
  },
  description:
    "Transform your Google Docs experience with Dark Docs 2.0 - the beautiful dark theme extension that reduces eye strain and enhances productivity. Free browser extension for Chrome, Firefox, Edge & Opera with 4.8★ rating from 1000+ users.",
  keywords: [
    "Google Docs dark theme",
    "dark mode extension",
    "Google Docs extension",
    "dark theme Chrome extension",
    "productivity tools",
    "eye strain reduction",
    "dark mode Google Docs",
    "writing tools",
    "browser extension",
    "Google Workspace dark mode",
    "document editor dark theme",
    "free Chrome extension",
    "Google Docs night mode",
    "dark UI extension",
  ],
  authors: [{ name: "Ameya Lambat", url: "https://ameyalambat.com" }],
  creator: "Ameya Lambat",
  publisher: "Dark Docs",
  category: "Browser Extension",
  classification: "Productivity Tool",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Dark Docs 2.0 - The Dark Theme Google Forgot",
    description:
      "Transform your Google Docs with a beautiful dark theme that reduces eye strain. Free extension with 4.8★ rating from 1000+ users. Available for all major browsers.",
    url: "/",
    siteName: "Dark Docs 2.0",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@ameyalambat",
    creator: "@ameyalambat",
    title: "Dark Docs 2.0 - The Dark Theme Google Forgot",
    description:
      "Transform Google Docs with a beautiful dark theme. Free extension with 4.8★ rating. Reduces eye strain & enhances productivity. Available for all browsers.",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Dark Docs 2.0",
  description:
    "Transform your Google Docs experience with Dark Docs 2.0 - the beautiful dark theme extension that reduces eye strain and enhances productivity.",
  url: SITE_URL,
  applicationCategory: "BrowserExtension",
  operatingSystem: "Chrome, Firefox, Edge, Opera",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1000",
    bestRating: "5",
    worstRating: "1",
  },
  author: {
    "@type": "Person",
    name: "Ameya Lambat",
    url: "https://ameyalambat.com",
  },
  publisher: {
    "@type": "Organization",
    name: "Dark Docs",
    url: SITE_URL,
  },
  datePublished: "2024-01-01",
  dateModified: new Date().toISOString().split("T")[0],
  keywords:
    "Google Docs dark theme, dark mode extension, productivity tools, eye strain reduction",
  screenshot: `${SITE_URL}/hero-alt.png`,
  downloadUrl:
    "https://chromewebstore.google.com/detail/docs-dark-20/djmmkojigpkdagglmjjdjiddopgdchcn",
};

type RootLayoutProps = Readonly<{
  children: unknown;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  const content = children as ReactNode;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Add JSON-LD to your page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {content}
        <Analytics />
      </body>
    </html>
  );
}

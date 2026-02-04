import type { Metadata } from "next"
import { Bodoni_Moda, IBM_Plex_Sans } from "next/font/google"
import "./globals.css"

const display = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
})

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"]
})

export const metadata: Metadata = {
  title: "API Hover — See API calls tied to UI interactions",
  description:
    "API Hover links UI interactions to network calls so you can see what fired, when, and why."
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  )
}

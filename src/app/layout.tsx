import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

// Manrope ima cirilicu i latinicu i cita se bolje od sistemskog fonta na
// gustim listama; sistemski font je bio dobar deo "ravnog" utiska.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Pasterova 16 — Stambena Zajednica",
    template: "%s · Pasterova 16",
  },
  description:
    "Portal stambene zajednice Pasterova 16: finansije, obavestenja, glasanja, zahtevi za odrzavanje, kalendar i digitalna arhiva.",
  applicationName: "Pasterova 16",
  authors: [
    { name: "Jovan Raosavljevic", url: "https://github.com/JoBaHP" },
  ],
  creator: "Jovan Raosavljevic",
  publisher: "Jovan Raosavljevic",
  openGraph: {
    title: "Pasterova 16 — Stambena Zajednica",
    description:
      "Portal stambene zajednice Pasterova 16: finansije, obavestenja, glasanja i digitalna arhiva.",
    type: "website",
    locale: "sr_RS",
    siteName: "Pasterova 16",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://pasterova-16.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pasterova 16 — Stambena Zajednica",
    description:
      "Portal stambene zajednice Pasterova 16: finansije, obavestenja, glasanja i digitalna arhiva.",
  },
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "Pasterova 16",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: true,
    address: false,
    email: true,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a8a" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sr" className={`${manrope.variable} h-full`}>
      <body className="h-full antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

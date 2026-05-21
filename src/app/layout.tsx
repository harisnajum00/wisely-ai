import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Providers from "@/components/providers/AuthProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Wisely by Haris — Ask anything. Understand everything.",
  description:
    "Your AI assistant for conversation, files, images, learning, and creativity.",
  keywords: [
    "AI assistant",
    "Wisely",
    "Haris",
    "chatbot",
    "AI chat",
    "conversation",
    "productivity",
    "creativity",
    "learning",
    "file analysis",
    "image understanding",
  ],
  authors: [{ name: "Haris" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Wisely by Haris — Ask anything. Understand everything.",
    description:
      "Your AI assistant for conversation, files, images, learning, and creativity.",
    url: "https://wisely.har.is",
    siteName: "Wisely by Haris",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wisely by Haris — Ask anything. Understand everything.",
    description:
      "Your AI assistant for conversation, files, images, learning, and creativity.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('wisely-theme');
              if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}

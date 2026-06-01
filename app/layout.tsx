import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { AppChrome } from "@/components/app/AppChrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Card Benefits Tracker",
  description: "Build and manage your card benefits lineup",
};

const themeInitScript = `
(function() {
  try {
    var preference = window.localStorage.getItem("memento-theme");
    var root = document.documentElement;

    if (preference === "light" || preference === "dark") {
      root.dataset.theme = preference;
      return;
    }

    root.removeAttribute("data-theme");
  } catch {
    document.documentElement.removeAttribute("data-theme");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} text-foreground antialiased`}
      >
        <script
          id="memento-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

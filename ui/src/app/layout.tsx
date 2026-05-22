import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Aufzug — MVG",
  description: "Smart urban accessibility system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${manrope.variable}`}>
      <body className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}


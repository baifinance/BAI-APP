import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "BAI Finance | A Friend in Finance, From First Home to Settled",
  description: "Broker-led loan preparation and live tracking for Philippines & Australia. Track your home loans, refinancing, and investments from submission to settlement.",
  keywords: ["Loan Brokerage", "Australia Home Loans", "Philippines Finance", "Loan Tracking", "BAI Finance"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} scroll-smooth antialiased`}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}

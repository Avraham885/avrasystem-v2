import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

// טוען את הפונט היבו מגוגל עם תמיכה בעברית
const heebo = Heebo({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "AvraSystem V2 - מערכת לניהול תורים",
  description: "המערכת המתקדמת לניהול עסק ותורים חכם",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={heebo.className}>
        <main className="min-h-screen bg-slate-50 text-slate-900">
          {children}
        </main>
      </body>
    </html>
  );
}
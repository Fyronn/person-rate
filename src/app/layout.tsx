import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rate507",
  description: "Arkadaş grubu için anonim günlük puan ve yorum uygulaması.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

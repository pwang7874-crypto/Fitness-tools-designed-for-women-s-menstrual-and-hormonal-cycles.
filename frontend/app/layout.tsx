import type { Metadata } from "next";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/inter";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "顺期健身app · 女性周期与情绪自适应训练",
  description: "每天读懂你的身体与心情，给出可解释、可替换、有温度的训练计划。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <Nav />
        <main id="main-content" className="pb-28 md:pb-16">{children}</main>
      </body>
    </html>
  );
}

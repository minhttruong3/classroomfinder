import type { Metadata } from "next";
import NavBar from "@/app/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClassroomFinder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}

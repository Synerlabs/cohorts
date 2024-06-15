import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {Sidebar} from "@/components/sidebar";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <Sidebar />
        </div>
      </body>

    </html>
  );
}

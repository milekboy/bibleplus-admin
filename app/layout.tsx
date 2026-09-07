import type { Metadata } from "next";
import localFont from "next/font/local";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const aeonik = localFont({
  src: [
    {
      path: "../public/fonts/AeonikProTRIAL/AeonikProTRIAL-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/AeonikProTRIAL/AeonikProTRIAL-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/AeonikProTRIAL/AeonikProTRIAL-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/AeonikProTRIAL/AeonikProTRIAL-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/AeonikProTRIAL/AeonikProTRIAL-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/AeonikProTRIAL/AeonikProTRIAL-Black.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-aeonik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BiblePlus Admin",
  description: "Secure administration for the BiblePlus platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${aeonik.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

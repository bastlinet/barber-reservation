import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Barber Reservations",
  description: "Public booking and admin for barber branches."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

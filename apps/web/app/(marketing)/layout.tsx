import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Pible",
  description: "Pible privacy policy",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

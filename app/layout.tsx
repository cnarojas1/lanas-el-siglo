import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:5173";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "Lanería El Siglo | Fibras, color y calidez",
    description:
      "Lanas suaves y fibras seleccionadas para todos tus proyectos. Despachos a todo Chile.",
    icons: {
      icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧶</text></svg>",
    },
    openGraph: {
      title: "Lanería El Siglo",
      description: "Fibras, color y calidez para cada proyecto.",
      images: [{ url: new URL("/og.png", metadataBase).toString(), width: 1200, height: 630 }],
      locale: "es_CL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Lanería El Siglo",
      description: "Fibras, color y calidez para cada proyecto.",
      images: [new URL("/og.png", metadataBase).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

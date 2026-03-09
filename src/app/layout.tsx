// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Terapia Online | Adriana Garibotti",
  description:
    "Agende sua sessão de terapia online com facilidade. Sessões individuais de 1 hora com uma terapeuta especializada.",
  keywords: "terapia online, psicoterapia, sessão individual, bem-estar, saúde mental",
  openGraph: {
    title: "Terapia Online | Adriana Garibotti",
    description: "Agende sua sessão de terapia online com facilidade.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#2C2C2C",
              color: "#FAFAF8",
              borderRadius: "12px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: { primary: "#4A6741", secondary: "#FAFAF8" },
            },
            error: {
              iconTheme: { primary: "#DC2626", secondary: "#FAFAF8" },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}

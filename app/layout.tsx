import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Offline CRM — Operator Console',
  description: 'Private relationship workspace and applicant review system for founders and operators.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-canvas text-ink antialiased selection:bg-signal-soft selection:text-signal">
        {children}
      </body>
    </html>
  );
}

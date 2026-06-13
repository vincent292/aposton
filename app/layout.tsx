import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aposton Mundial 2026',
  description: 'App premium para apuestas familiares del Mundial 2026.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <div className="stadium" />
        <div className="light l1" />
        <div className="light l2" />
        <div className="light l3" />
        <div className="light l4" />
        <div className="light l5" />
        {children}
      </body>
    </html>
  );
}

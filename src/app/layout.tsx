import type { Metadata } from 'next';
import { Truculenta } from 'next/font/google';
import './globals.css';

const truculenta = Truculenta({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kaleidoscope',
  description: 'Into the world of color!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={truculenta.className}>{children}</body>
    </html>
  );
}

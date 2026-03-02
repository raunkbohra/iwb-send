import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'iWB Send - Global Communication Infrastructure',
  description: 'Send SMS, Email, WhatsApp, and Voice calls through one unified API. Built for Nepal, India, and global expansion.',
  keywords: 'SMS API, Email API, WhatsApp API, Voice API, Communication Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import './globals.css';

export const metadata = {
  title: 'Hostel Laundry',
  description: 'Live washing machine availability for the hostel',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Laundry', statusBarStyle: 'default' },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#6b5cff' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}

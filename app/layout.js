import './globals.css';

export const metadata = {
  title: 'Hostel Laundry',
  description: 'Live washing machine availability for the hostel',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}

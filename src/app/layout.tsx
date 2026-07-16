import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'Linksy - Ứng dụng chat',
  description: 'Kết nối và trò chuyện với mọi người',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AppProviders>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppProviders>
      </body>
    </html>
  )
}
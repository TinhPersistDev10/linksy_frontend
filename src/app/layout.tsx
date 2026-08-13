import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AppProviders } from './providers';
import { THEME_BOOTSTRAP_SCRIPT } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Linksy - Ứng dụng chat',
  description: 'Kết nối và trò chuyện với mọi người',
  icons: {
    icon: [
      { url: "/brand/logo-favicon-transparent.png", type: "image/png", sizes: "128x128" },
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
    ],
    shortcut: "/brand/logo-favicon-transparent.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <AppProviders>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </AppProviders>
      </body>
    </html>
  )
}
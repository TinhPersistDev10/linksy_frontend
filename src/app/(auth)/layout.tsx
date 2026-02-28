'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && isAuthenticated && !pathname.includes('/verify-email')) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router, pathname]);

  return <>{children}</>;
}
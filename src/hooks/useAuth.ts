// src/lib/hooks/useAuth.ts
// Hook tách biệt khỏi context — đây là single source of truth cho useAuth
// Tất cả component import từ đây, KHÔNG import từ AuthContext trực tiếp
//
// Lợi ích:
// - Nếu sau này đổi auth library (ví dụ: next-auth, clerk...) chỉ cần sửa file này
// - Component không cần biết auth được implement như thế nào

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
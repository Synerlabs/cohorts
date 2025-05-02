'use client';

import { AuthRedirectHandler } from '@/components/auth-redirect-handler';
import { usePathname } from 'next/navigation';

interface AuthProviderClientProps {
  children: React.ReactNode;
}

export function AuthProviderClient({ children }: AuthProviderClientProps) {
  const pathname = usePathname();

  return (
    <>
      {children}
      <AuthRedirectHandler pathname={pathname} />
    </>
  );
} 
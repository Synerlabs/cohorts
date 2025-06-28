'use client';

import { AuthRedirectHandler } from '@/components/auth-redirect-handler';
import { usePathname, useSearchParams } from 'next/navigation';

interface AuthProviderClientProps {
  children: React.ReactNode;
}

export function AuthProviderClient({ children }: AuthProviderClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <>
      {children}
      <AuthRedirectHandler pathname={pathname} searchParams={searchParams} />
    </>
  );
} 
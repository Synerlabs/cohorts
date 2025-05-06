'use client';

import { useRouter } from 'next/navigation';
import AffiliateTable from './affiliate-table';
import { Affiliate } from '@/services/affiliate.service';
import { useEffect } from 'react';

interface AffiliateTableWrapperProps {
  affiliates: Affiliate[];
  affiliateStatus?: string;
  orgId: string;
  orgSlug: string;
}

export default function AffiliateTableWrapper({
  affiliates,
  affiliateStatus = 'active',
  orgId,
  orgSlug,
}: AffiliateTableWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    console.log('AffiliateTableWrapper received affiliates:', affiliates);
    console.log('Affiliates array length:', affiliates.length);
    if (affiliates.length > 0) {
      console.log('First affiliate sample:', affiliates[0]);
    }
  }, [affiliates]);

  const handleStatusChange = () => {
    // Refresh the current route
    router.refresh();
  };

  return (
    <AffiliateTable
      affiliates={affiliates}
      affiliateStatus={affiliateStatus}
      orgId={orgId}
      orgSlug={orgSlug}
      onStatusChange={handleStatusChange}
    />
  );
} 
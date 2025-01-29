import { cache } from 'react';
import { getOrgBySlug } from '@/services/org.service';
import { getCurrentUser } from '@/services/user.service';

export const getCachedOrgBySlug = cache(async (slug: string) => {
  return getOrgBySlug(slug);
});

export const getCachedCurrentUser = cache(async () => {
  return getCurrentUser();
}); 
import { cache } from 'react';
import { getOrgBySlug } from '@/services/org.service';
import { getCurrentUser } from '@/services/user.service';

export const getCachedOrgBySlug = cache(async (slug: string) => {
  console.log("FETCHING ORG", slug);
  return getOrgBySlug(slug);
});

export const getCachedCurrentUser = cache(async () => {
  console.log("FETCHING USER");
  return getCurrentUser();
}); 
import { MembershipSuborder } from '@/lib/types/suborder';

export const membershipSuborderProcessor = async (suborder: MembershipSuborder) => {
  await suborder.process();
}; 
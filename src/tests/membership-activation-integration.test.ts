import { createMembershipApplication } from '@/services/applications.service';
import { approveApplication, completePayment } from '@/services/join.service';
import { SuborderService } from '@/services/suborder.service';
import { createClient } from '@/lib/utils/supabase/server';
import { MembershipActivationType } from '@/lib/types/membership';

// --- Shared Test Utilities ---

async function createTestUser() {
  // Replace with actual user creation logic or mock
  return { id: 'test-user-id' };
}

async function createTestGroup() {
  // Replace with actual group creation logic or mock
  return { id: 'test-group-id' };
}

async function createTestMembershipTier(groupId: string, activationType: MembershipActivationType) {
  // Replace with actual tier creation logic or mock
  return { id: 'test-tier-id', group_id: groupId, activation_type: activationType };
}

async function assertMembershipActive(userId: string, groupId: string, tierId: string) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('memberships')
    .select('*')
    .eq('group_user_id', userId)
    .eq('tier_id', tierId)
    .single();
  expect(membership).toBeDefined();
  expect(membership.status).toBe('active');
}

// --- Integration Tests ---

describe('Membership Activation Integration Tests', () => {
  let user: any, group: any, tier: any;

  beforeEach(async () => {
    user = await createTestUser();
    group = await createTestGroup();
  });

  test('should activate membership via automatic activation', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.AUTOMATIC);
    const application = await createMembershipApplication(user.id, tier.id);
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after admin review', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.REVIEW_REQUIRED);
    const application = await createMembershipApplication(user.id, tier.id);
    await approveApplication(application.id);
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after automatic payment', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.PAYMENT_REQUIRED);
    const application = await createMembershipApplication(user.id, tier.id);
    await completePayment(application.id); // Simulate Stripe payment
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after manual payment approval', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.PAYMENT_REQUIRED);
    const application = await createMembershipApplication(user.id, tier.id);
    // Simulate manual payment: create suborder, set status, approve payment, process suborder
    // For now, just call approveApplication and processSuborder (mocked)
    await approveApplication(application.id); // Simulate admin approval
    await SuborderService.processOrderSuborders('test-order-id'); // Replace with real order id if available
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after form submission', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.FORM_REQUIRED);
    const formData = { field1: 'value1' };
    const application = await createMembershipApplication(user.id, tier.id, formData);
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after form then review', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.FORM_THEN_REVIEW);
    const formData = { field1: 'value1' };
    const application = await createMembershipApplication(user.id, tier.id, formData);
    await approveApplication(application.id);
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after form then payment', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.FORM_THEN_PAYMENT);
    const formData = { field1: 'value1' };
    const application = await createMembershipApplication(user.id, tier.id, formData);
    await completePayment(application.id);
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after form then payment then review', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW);
    const formData = { field1: 'value1' };
    const application = await createMembershipApplication(user.id, tier.id, formData);
    await completePayment(application.id);
    await approveApplication(application.id);
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after review then payment', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.REVIEW_THEN_PAYMENT);
    const application = await createMembershipApplication(user.id, tier.id);
    await approveApplication(application.id);
    await completePayment(application.id);
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership after form then review then payment', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT);
    const formData = { field1: 'value1' };
    const application = await createMembershipApplication(user.id, tier.id, formData);
    await approveApplication(application.id);
    await completePayment(application.id);
    await assertMembershipActive(user.id, group.id, tier.id);
  });

  test('should activate membership via suborder processing', async () => {
    tier = await createTestMembershipTier(group.id, MembershipActivationType.PAYMENT_REQUIRED);
    const application = await createMembershipApplication(user.id, tier.id);
    // Simulate suborder creation and processing
    await SuborderService.processOrderSuborders('test-order-id'); // Replace with real order id if available
    await assertMembershipActive(user.id, group.id, tier.id);
  });
}); 
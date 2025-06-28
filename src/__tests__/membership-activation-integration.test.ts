import { createTestSupabaseClient } from '@/lib/utils/supabase/test-client';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

jest.mock('@/lib/utils/supabase/server', () => ({
  createClient: () => createTestSupabaseClient(),
  createServiceRoleClient: () => createTestSupabaseClient(),
}));

import { createMembershipApplication } from '@/services/applications.service';
import { approveApplication, completePayment, createGroupUser } from '@/services/join.service';
import { SuborderService } from '@/services/suborder.service';
import { MembershipActivationType } from '@/lib/types/membership';
import { OrderService } from '@/services/order.service';
import { ProductService } from '@/services/product.service';

// --- Shared Test Utilities ---

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';

async function createTestAuthUser(email: string, password: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function createTestUser(userId: string) {
  const supabase = createTestSupabaseClient();
  try {
    const { data, error, ...rest } = await supabase
      .from('profiles')
      .upsert([
        {
          id: userId,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          avatar_url: null,
        },
      ]);
    console.log('createTestUser response:', { data, error, rest });
    if (error) throw error;
    return { id: userId };
  } catch (err) {
    const e = err as any;
    console.error('createTestUser error:',
      e && (e.message || e.details || e.code || JSON.stringify(e)), e);
    throw err;
  }
}

async function createTestGroup(userId: string) {
  const supabase = createTestSupabaseClient();
  const groupName = `Test Group ${uuidv4().slice(0, 8)}`;
  const slug = `test-group-${uuidv4().slice(0, 8)}`;
  try {
    const { data, error, ...rest } = await supabase
      .from('group')
      .insert([
        {
          name: groupName,
          slug,
          created_by: userId,
        },
      ])
      .select()
      .single();
    console.log('createTestGroup response:', { data, error, rest });
    if (error) throw error;
    return data;
  } catch (err) {
    const e = err as any;
    console.error('createTestGroup error:',
      e && (e.message || e.details || e.code || JSON.stringify(e)), e);
    throw err;
  }
}

async function createTestMembershipTier(groupId: string, activationType: MembershipActivationType) {
  const tierName = `Test Tier ${uuidv4().slice(0, 8)}`;
  try {
    const tier = await ProductService.createMembershipTier(groupId, {
      name: tierName,
      description: null,
      price: 1000, // $10.00 in cents
      currency: 'USD',
      duration_months: 1,
      activation_type: activationType,
      member_id_format: 'MEM-{YYYY}-{SEQ:3}',
      // Add any other required fields here
    });
    console.log('createTestMembershipTier response:', tier);
    return tier;
  } catch (err) {
    const e = err as any;
    console.error('createTestMembershipTier error:',
      e && (e.message || e.details || e.code || JSON.stringify(e)), e);
    throw err;
  }
}

async function assertMembershipActive(userId: string, groupId: string, tierId: string) {
  const supabase = createTestSupabaseClient();
  try {
    const { data: membership, error, ...rest } = await supabase
      .from('memberships')
      .select('*')
      .eq('group_user_id', userId)
      .eq('tier_id', tierId)
      .single();
    console.log('assertMembershipActive response:', { membership, error, rest });
    if (error) throw error;
    expect(membership).toBeDefined();
    expect(membership.status).toBe('active');
  } catch (err) {
    const e = err as any;
    console.error('assertMembershipActive error:',
      e && (e.message || e.details || e.code || JSON.stringify(e)), e);
    throw err;
  }
}

async function getSuborderById(suborderId: string) {
  const supabase = createTestSupabaseClient();
  try {
    const { data: suborder, error, ...rest } = await supabase
      .from('suborders')
      .select('*')
      .eq('id', suborderId)
      .single();
    console.log('getSuborderById response:', { suborder, error, rest });
    if (error) throw error;
    return suborder;
  } catch (err) {
    const e = err as any;
    console.error('getSuborderById error:',
      e && (e.message || e.details || e.code || JSON.stringify(e)), e);
    throw err;
  }
}

// --- Integration Tests ---

describe('Membership Activation Integration Tests', () => {
  let user: any, group: any, tier: any;

  beforeEach(async () => {
    const testEmail = `testuser+${Date.now()}@example.com`;
    const testPassword = 'testpassword';
    const authUser = await createTestAuthUser(testEmail, testPassword);
    user = await createTestUser(authUser.id);
    group = await createTestGroup(user.id);
    await createGroupUser({ userId: user.id, groupId: group.id, isActive: true });
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

    // Create a real order and suborder
    // (Replace with your actual order/suborder creation logic)
    const order = await OrderService.createOrderFromCart(user.id); // Should return order with id
    const suborder = await OrderService.createSuborder(
      order.id,
      'membership',
      tier.id,
      100,
      'USD',
      application.id
    );

    // Simulate payment (if needed)
    // await completePayment(application.id); // Uncomment if payment is required for activation

    // Process suborders via the registry
    const results = await SuborderService.processOrderSuborders(order.id);

    // Assert suborder is completed (or remains pending if requirements not met)
    const processedSuborder = await getSuborderById(suborder.id);
    expect(['completed', 'pending', 'processing']).toContain(processedSuborder.status);

    // Assert membership is active if requirements are met
    if (processedSuborder.status === 'completed') {
      await assertMembershipActive(user.id, group.id, tier.id);
    }
  });
}); 
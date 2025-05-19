import { createMembershipApplication } from '@/services/applications.service';
import { approveApplication, completePayment } from '@/services/join.service';
import { createClient } from '@/lib/utils/supabase/server';
import { MembershipActivationType } from '@/lib/types/membership';

// Mock the createClient function
jest.mock('@/lib/utils/supabase/server', () => ({
  createClient: jest.fn()
}));

// Mock ProductService
jest.mock('@/services/product.service', () => ({
  ProductService: {
    getMembershipTier: jest.fn()
  }
}));

describe('Membership Activation Flow Tests', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      inner: jest.fn().mockReturnThis()
    };
    
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // Helper function to setup common mock data
  const setupMockData = (activationType: MembershipActivationType, price: number = 0, formTemplateId: string | null = null) => {
    // Mock product data
    const mockProduct = {
      id: 'product-123',
      price: price,
      membership_tier: {
        id: 'tier-123',
        activation_type: activationType,
        duration_months: 12,
        form_template_id: formTemplateId
      }
    };
    
    // Mock group user data
    const mockGroupUser = {
      id: 'group-user-123',
      user_id: 'user-123',
      group_id: 'group-123',
      is_active: false
    };
    
    // Mock application data - status will be set by the test
    const mockApplication: {
      id: string;
      group_user_id: string;
      tier_id: string;
      status: string;
      approved_at: string | null;
      form_response_id: string | null;
    } = {
      id: 'app-123',
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'pending',
      approved_at: null,
      form_response_id: formTemplateId
    };
    
    // Mock membership data
    const mockMembership = {
      id: 'membership-123',
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'active',
      is_active: true,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Mock application view data with explicit type
    const mockApplicationView: {
      id: string;
      group_user_id: string;
      tier_id: string;
      status: string;
      approved_at: string | null;
      form_response_id: string | null;
      tier_name: string;
      group_name: string;
    } = {
      ...mockApplication,
      tier_name: 'Test Tier',
      group_name: 'Test Group'
    };

    // Mock application with tier details for approveApplication
    const mockApplicationWithTier = {
      id: 'app-123',
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      tier: [{
        id: 'product-123',
        type: 'membership_tier',
        name: 'Test Tier',
        description: 'Test Description',
        price: price,
        currency: 'USD',
        group_id: 'group-123',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        form_template_id: formTemplateId,
        membership_tiers: [{
          product_id: 'product-123',
          duration_months: 12,
          activation_type: activationType,
          member_id_format: 'MEM-{YYYY}-{SEQ:3}',
          form_template_id: formTemplateId
        }]
      }]
    };

    // Mock form response data
    const mockFormResponse = formTemplateId ? {
      id: 'form-response-123',
      template_id: formTemplateId,
      response_data: { field1: 'value1', field2: 'value2' },
      submitted_by: 'user-123'
    } : null;

    return {
      mockProduct,
      mockGroupUser,
      mockApplication,
      mockMembership,
      mockApplicationView,
      mockApplicationWithTier,
      mockFormResponse
    };
  };

  // Test 1: AUTOMATIC activation flow
  test('AUTOMATIC activation flow: should create application, membership, and activate group user immediately', async () => {
    const { 
      mockProduct, 
      mockGroupUser, 
      mockApplication, 
      mockMembership, 
      mockApplicationView 
    } = setupMockData(MembershipActivationType.AUTOMATIC);

    // Override application status for automatic activation
    mockApplication.status = 'approved';
    mockApplication.approved_at = new Date().toISOString();
    (mockApplicationView as any).status = 'approved';
    (mockApplicationView as any).approved_at = new Date().toISOString();

    // Setup ProductService mock
    const ProductService = require('@/services/product.service').ProductService;
    ProductService.getMembershipTier.mockResolvedValue(mockProduct);

    // Setup mock responses
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'group_users') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockGroupUser, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockGroupUser, is_active: true }, error: null });
      } else if (table === 'applications') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplication, error: null });
      } else if (table === 'memberships') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });
      } else if (table === 'membership_applications_view') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationView, error: null });
      }
      return mockSupabase;
    });

    // Call the function
    const result = await createMembershipApplication('group-user-123', 'tier-123');

    // Assertions
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'approved',
      approved_at: expect.any(String)
    }));
    
    // Check that membership was created
    expect(mockSupabase.from).toHaveBeenCalledWith('memberships');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'active',
      is_active: true
    }));
    
    // Check that group user was activated
    expect(mockSupabase.from).toHaveBeenCalledWith('group_users');
    expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: true });
    
    // Check result
    expect(result).toBeDefined();
    expect(result.status).toBe('approved');
  });

  // Test 2: FORM_REQUIRED activation flow
  test('FORM_REQUIRED activation flow: should create application, membership, and activate group user after form submission', async () => {
    const { 
      mockProduct, 
      mockGroupUser, 
      mockApplication, 
      mockMembership, 
      mockApplicationView,
      mockFormResponse
    } = setupMockData(MembershipActivationType.FORM_REQUIRED, 0, 'form-template-123');

    // Override application status for form_required activation
    mockApplication.status = 'approved';
    mockApplication.approved_at = new Date().toISOString();
    (mockApplicationView as any).status = 'approved';
    (mockApplicationView as any).approved_at = new Date().toISOString();

    // Setup ProductService mock
    const ProductService = require('@/services/product.service').ProductService;
    ProductService.getMembershipTier.mockResolvedValue(mockProduct);

    // Setup mock responses
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'group_users') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockGroupUser, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockGroupUser, is_active: true }, error: null });
      } else if (table === 'applications') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplication, error: null });
      } else if (table === 'memberships') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });
      } else if (table === 'membership_applications_view') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationView, error: null });
      } else if (table === 'form_responses') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockFormResponse, error: null });
      }
      return mockSupabase;
    });

    // Call the function with form data
    const formData = { field1: 'value1', field2: 'value2' };
    const result = await createMembershipApplication('group-user-123', 'tier-123', formData);

    // Assertions
    // Check that form response was created
    expect(mockSupabase.from).toHaveBeenCalledWith('form_responses');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      template_id: 'form-template-123',
      response_data: formData,
      submitted_by: 'user-123'
    }));

    // Check that application was created with approved status
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'approved',
      form_response_id: 'form-response-123',
      approved_at: expect.any(String)
    }));
    
    // Check that membership was created
    expect(mockSupabase.from).toHaveBeenCalledWith('memberships');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'active',
      is_active: true
    }));
    
    // Check that group user was activated
    expect(mockSupabase.from).toHaveBeenCalledWith('group_users');
    expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: true });
    
    // Check result
    expect(result).toBeDefined();
    expect(result.status).toBe('approved');
  });

  // Test 3: REVIEW_REQUIRED activation flow
  test('REVIEW_REQUIRED activation flow: should create pending application, then create membership and activate group user after approval', async () => {
    const { 
      mockProduct, 
      mockGroupUser, 
      mockApplication, 
      mockMembership, 
      mockApplicationView,
      mockApplicationWithTier
    } = setupMockData(MembershipActivationType.REVIEW_REQUIRED);

    // Setup ProductService mock
    const ProductService = require('@/services/product.service').ProductService;
    ProductService.getMembershipTier.mockResolvedValue(mockProduct);

    // Setup mock responses for application creation
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'group_users') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockGroupUser, error: null });
      } else if (table === 'applications') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplication, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockApplication, status: 'approved', approved_at: new Date().toISOString() }, error: null });
      } else if (table === 'membership_applications_view') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationView, error: null });
      }
      return mockSupabase;
    });

    // Call the function to create application
    const applicationResult = await createMembershipApplication('group-user-123', 'tier-123');

    // Assertions for application creation
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'pending'
    }));
    
    // Check that membership was NOT created yet
    expect(mockSupabase.from).not.toHaveBeenCalledWith('memberships');
    
    // Check that group user was NOT activated yet
    expect(mockSupabase.update).not.toHaveBeenCalled();
    
    // Check application result
    expect(applicationResult).toBeDefined();
    expect(applicationResult.status).toBe('pending');

    // Reset mocks for approval step
    jest.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'applications') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationWithTier, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ error: null });
      } else if (table === 'memberships') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });
      } else if (table === 'group_users') {
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockGroupUser, is_active: true }, error: null });
      }
      return mockSupabase;
    });

    // Call the function to approve application
    await approveApplication('app-123');

    // Assertions for approval
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ 
      status: 'approved',
      approved_at: expect.any(String)
    }));
    
    // Check that membership was created
    expect(mockSupabase.from).toHaveBeenCalledWith('memberships');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'active',
      is_active: true
    }));
    
    // Check that group user was activated
    expect(mockSupabase.from).toHaveBeenCalledWith('group_users');
    expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: true });
  });

  // Test 4: PAYMENT_REQUIRED activation flow
  test('PAYMENT_REQUIRED activation flow: should create pending_payment application, then create membership and activate group user after payment', async () => {
    const { 
      mockProduct, 
      mockGroupUser, 
      mockApplication, 
      mockMembership, 
      mockApplicationView,
      mockApplicationWithTier
    } = setupMockData(MembershipActivationType.PAYMENT_REQUIRED, 1000); // $10.00

    // Override application status for payment_required activation
    mockApplication.status = 'pending_payment';

    // Setup ProductService mock
    const ProductService = require('@/services/product.service').ProductService;
    ProductService.getMembershipTier.mockResolvedValue(mockProduct);

    // Setup mock responses for application creation
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'group_users') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockGroupUser, error: null });
      } else if (table === 'applications') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplication, error: null });
      } else if (table === 'membership_applications_view') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockApplicationView, status: 'pending_payment' } as any, error: null });
      }
      return mockSupabase;
    });

    // Call the function to create application
    const applicationResult = await createMembershipApplication('group-user-123', 'tier-123');

    // Assertions for application creation
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'pending_payment'
    }));
    
    // Check that membership was NOT created yet
    expect(mockSupabase.from).not.toHaveBeenCalledWith('memberships');
    
    // Check that group user was NOT activated yet
    expect(mockSupabase.update).not.toHaveBeenCalled();
    
    // Check application result
    expect(applicationResult).toBeDefined();
    expect(applicationResult.status).toBe('pending_payment');

    // Reset mocks for payment completion step
    jest.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'applications') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationWithTier, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ error: null });
      } else if (table === 'memberships') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });
      } else if (table === 'group_users') {
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockGroupUser, is_active: true }, error: null });
      }
      return mockSupabase;
    });

    // Call the function to complete payment
    await completePayment('app-123');

    // Assertions for payment completion
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ 
      status: 'approved',
      approved_at: expect.any(String)
    }));
    
    // Check that membership was created
    expect(mockSupabase.from).toHaveBeenCalledWith('memberships');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'active',
      is_active: true
    }));
    
    // Check that group user was activated
    expect(mockSupabase.from).toHaveBeenCalledWith('group_users');
    expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: true });
  });

  // Test 5: FORM_THEN_REVIEW_THEN_PAYMENT activation flow (the most complex flow)
  test('FORM_THEN_REVIEW_THEN_PAYMENT activation flow: should create pending application with form, then approve, then complete payment', async () => {
    const { 
      mockProduct, 
      mockGroupUser, 
      mockApplication, 
      mockMembership, 
      mockApplicationView,
      mockApplicationWithTier,
      mockFormResponse
    } = setupMockData(MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT, 1000, 'form-template-123');

    // Setup ProductService mock
    const ProductService = require('@/services/product.service').ProductService;
    ProductService.getMembershipTier.mockResolvedValue(mockProduct);

    // Setup mock responses for application creation with form
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'group_users') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockGroupUser, error: null });
      } else if (table === 'applications') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplication, error: null });
      } else if (table === 'membership_applications_view') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationView, error: null });
      } else if (table === 'form_responses') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockFormResponse, error: null });
      }
      return mockSupabase;
    });

    // Call the function to create application with form data
    const formData = { field1: 'value1', field2: 'value2' };
    const applicationResult = await createMembershipApplication('group-user-123', 'tier-123', formData);

    // Assertions for application creation with form
    expect(mockSupabase.from).toHaveBeenCalledWith('form_responses');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      template_id: 'form-template-123',
      response_data: formData,
      submitted_by: 'user-123'
    }));

    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'pending',
      form_response_id: 'form-response-123'
    }));
    
    // Check that membership was NOT created yet
    expect(mockSupabase.from).not.toHaveBeenCalledWith('memberships');
    
    // Check that group user was NOT activated yet
    expect(mockSupabase.update).not.toHaveBeenCalled();
    
    // Check application result
    expect(applicationResult).toBeDefined();
    expect(applicationResult.status).toBe('pending');

    // Reset mocks for approval step
    jest.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'applications') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationWithTier, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ error: null });
      }
      return mockSupabase;
    });

    // Call the function to approve application (changes status to pending_payment)
    await approveApplication('app-123');

    // Assertions for approval
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ 
      status: 'pending_payment',
      approved_at: expect.any(String)
    }));
    
    // Check that membership was NOT created yet (after approval but before payment)
    expect(mockSupabase.from).not.toHaveBeenCalledWith('memberships');
    
    // Check that group user was NOT activated yet
    expect(mockSupabase.update).not.toHaveBeenCalledWith({ is_active: true });

    // Reset mocks for payment completion step
    jest.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'applications') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationWithTier, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ error: null });
      } else if (table === 'memberships') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });
      } else if (table === 'group_users') {
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockGroupUser, is_active: true }, error: null });
      }
      return mockSupabase;
    });

    // Call the function to complete payment
    await completePayment('app-123');

    // Assertions for payment completion
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ 
      status: 'approved'
    }));
    
    // Check that membership was created after payment
    expect(mockSupabase.from).toHaveBeenCalledWith('memberships');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'active',
      is_active: true
    }));
    
    // Check that group user was activated after payment
    expect(mockSupabase.from).toHaveBeenCalledWith('group_users');
    expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: true });
  });

  // Test 6: Manual Payment Approval Flow
  test('Manual Payment Approval Flow: should activate membership after admin approves manual payment', async () => {
    const { 
      mockProduct, 
      mockGroupUser, 
      mockApplication, 
      mockMembership, 
      mockApplicationView 
    } = setupMockData(MembershipActivationType.PAYMENT_REQUIRED);

    // Override application status for manual payment flow
    mockApplication.status = 'pending_payment';
    mockApplicationView.status = 'pending_payment';

    // Setup ProductService mock
    const ProductService = require('@/services/product.service').ProductService;
    ProductService.getMembershipTier.mockResolvedValue(mockProduct);

    // Setup mock responses for manual payment approval
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'group_users') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockGroupUser, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockGroupUser, is_active: true }, error: null });
      } else if (table === 'applications') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplication, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: { ...mockApplication, status: 'approved' }, error: null });
      } else if (table === 'memberships') {
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });
      } else if (table === 'membership_applications_view') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockApplicationView, error: null });
      }
      return mockSupabase;
    });

    // Simulate admin approving manual payment
    await approveApplication('app-123');

    // Verify that membership is activated
    const { data: membership } = await mockSupabase.from('memberships').select('*').eq('application_id', 'app-123').single();
    expect(membership).toBeDefined();
    expect(membership.status).toBe('active');
  });
}); 
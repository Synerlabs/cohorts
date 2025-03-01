import { createMembershipApplication } from '@/services/applications.service';
import { createClient } from '@/lib/utils/supabase/server';
import { MembershipActivationType } from '@/lib/types/membership';

// Mock the createClient function
jest.mock('@/lib/utils/supabase/server', () => ({
  createClient: jest.fn()
}));

describe('Automatic Activation Tests', () => {
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
      single: jest.fn()
    };
    
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });
  
  test('should create membership record for automatic activation', async () => {
    // Mock product data
    const mockProduct = {
      id: 'product-123',
      price: 0,
      membership_tier: {
        id: 'tier-123',
        activation_type: MembershipActivationType.AUTOMATIC,
        duration_months: 12,
        form_template_id: null
      }
    };
    
    // Mock group user data
    const mockGroupUser = {
      id: 'group-user-123',
      user_id: 'user-123',
      group_id: 'group-123'
    };
    
    // Mock application data
    const mockApplication = {
      id: 'app-123',
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'approved',
      approved_at: new Date().toISOString()
    };
    
    // Mock membership data
    const mockMembership = {
      id: 'membership-123',
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'active',
      is_active: true
    };
    
    // Mock application view data
    const mockApplicationView = {
      ...mockApplication,
      tier_name: 'Test Tier',
      group_name: 'Test Group'
    };
    
    // Setup mock responses
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'group_users') {
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ data: mockGroupUser, error: null });
        mockSupabase.update.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValueOnce({ error: null });
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
    
    // Mock ProductService.getMembershipTier
    jest.mock('@/services/product.service', () => ({
      ProductService: {
        getMembershipTier: jest.fn().mockResolvedValue(mockProduct)
      }
    }));
    
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
  });
  
  test('should not create membership record for non-automatic activation', async () => {
    // Mock product data with non-automatic activation
    const mockProduct = {
      id: 'product-123',
      price: 0,
      membership_tier: {
        id: 'tier-123',
        activation_type: MembershipActivationType.REVIEW_REQUIRED,
        duration_months: 12,
        form_template_id: null
      }
    };
    
    // Mock group user data
    const mockGroupUser = {
      id: 'group-user-123',
      user_id: 'user-123',
      group_id: 'group-123'
    };
    
    // Mock application data
    const mockApplication = {
      id: 'app-123',
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'pending',
      approved_at: null
    };
    
    // Mock application view data
    const mockApplicationView = {
      ...mockApplication,
      tier_name: 'Test Tier',
      group_name: 'Test Group'
    };
    
    // Setup mock responses
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
      }
      return mockSupabase;
    });
    
    // Mock ProductService.getMembershipTier
    jest.mock('@/services/product.service', () => ({
      ProductService: {
        getMembershipTier: jest.fn().mockResolvedValue(mockProduct)
      }
    }));
    
    // Call the function
    const result = await createMembershipApplication('group-user-123', 'tier-123');
    
    // Assertions
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      group_user_id: 'group-user-123',
      tier_id: 'tier-123',
      status: 'pending'
    }));
    
    // Check that membership was NOT created
    expect(mockSupabase.from).not.toHaveBeenCalledWith('memberships');
    
    // Check that group user was NOT activated
    expect(mockSupabase.update).not.toHaveBeenCalled();
    
    // Check result
    expect(result).toBeDefined();
  });
}); 
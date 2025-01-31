import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import { MembershipService } from "@/services/membership.service";
import { MemberIdService } from "@/services/member-id.service";
import { MembershipStatus } from "@/lib/types/membership";
import * as supabaseServer from "@/lib/utils/supabase/server";

describe('MembershipService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Create mock Supabase instance
    mockSupabase = {
      rpc: mock(() => Promise.resolve({})),
      from: mock(() => mockSupabase),
      select: mock(() => mockSupabase),
      insert: mock(() => mockSupabase),
      update: mock(() => mockSupabase),
      eq: mock(() => mockSupabase),
      single: mock(() => Promise.resolve({ data: null, error: null }))
    };

    // Mock createClient
    spyOn(supabaseServer, 'createClient').mockImplementation(() => mockSupabase);
  });

  describe('createMembership', () => {
    it('should create membership and assign member ID', async () => {
      const now = new Date();
      const startDate = '2024-01-30T00:00:00Z';
      const endDate = '2025-01-30T00:00:00Z';

      // Mock group user query
      spyOn(mockSupabase, 'single')
        .mockImplementationOnce(() => Promise.resolve({
          data: { group_id: 'group-123' },
          error: null
        }))
        // Mock membership tier settings query
        .mockImplementationOnce(() => Promise.resolve({
          data: { member_id_format: 'MEM-{YYYY}-{SEQ:3}' },
          error: null
        }))
        // Mock membership insert
        .mockImplementationOnce(() => Promise.resolve({
          data: {
            id: 'membership-123',
            order_id: 'order-123',
            group_user_id: 'user-123',
            tier_id: 'tier-123',
            status: MembershipStatus.ACTIVE,
            start_date: startDate,
            end_date: endDate,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          },
          error: null
        }));

      // Mock MemberIdService
      const generateMemberId = spyOn(MemberIdService, 'generateMemberId')
        .mockImplementation(() => Promise.resolve('MEM-2024-001'));
      const assignMemberIdToMembership = spyOn(MemberIdService, 'assignMemberIdToMembership')
        .mockImplementation(() => Promise.resolve());

      const membership = await MembershipService.createMembership({
        order_id: 'order-123',
        group_user_id: 'user-123',
        tier_id: 'tier-123',
        start_date: startDate,
        end_date: endDate
      });

      expect(membership).toEqual({
        id: 'membership-123',
        order_id: 'order-123',
        group_user_id: 'user-123',
        tier_id: 'tier-123',
        status: MembershipStatus.ACTIVE,
        start_date: startDate,
        end_date: endDate,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });

      // Verify member ID was generated and assigned
      expect(generateMemberId).toHaveBeenCalledWith(
        'group-123',
        'MEM-{YYYY}-{SEQ:3}'
      );
      expect(assignMemberIdToMembership).toHaveBeenCalledWith(
        'membership-123',
        'MEM-2024-001'
      );
    });

    it('should rollback on error', async () => {
      // Mock group user query to succeed
      spyOn(mockSupabase, 'single')
        .mockImplementationOnce(() => Promise.resolve({
          data: { group_id: 'group-123' },
          error: null
        }))
        // Mock membership tier settings query
        .mockImplementationOnce(() => Promise.resolve({
          data: { member_id_format: 'MEM-{YYYY}-{SEQ:3}' },
          error: null
        }))
        // Mock membership insert
        .mockImplementationOnce(() => Promise.resolve({
          data: {
            id: 'membership-123',
            order_id: 'order-123',
            group_user_id: 'user-123',
            tier_id: 'tier-123',
            status: MembershipStatus.ACTIVE,
            start_date: '2024-01-30T00:00:00Z',
            end_date: '2025-01-30T00:00:00Z',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          error: null
        }))
        // Mock membership tier settings query to fail
        .mockImplementationOnce(() => Promise.resolve({
          data: null,
          error: { message: 'Membership tier settings not found' }
        }));

      await expect(MembershipService.createMembership({
        order_id: 'order-123',
        group_user_id: 'user-123',
        tier_id: 'tier-123'
      })).rejects.toThrow('Membership tier settings not found');

      // Verify transaction was rolled back
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rollback_transaction');
    });
  });
}); 

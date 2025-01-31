/// <reference types="bun-types" />

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { MemberIdService } from '../member-id.service';
import { createClient } from '@/lib/utils/supabase/server';

let mockSupabase: any;

// Mock Supabase client
mock('@/lib/utils/supabase/server', () => ({
  createClient: () => mockSupabase
}));

describe('MemberIdService', () => {
  const mockGroupId = 'group-123';
  const mockGroupUserId = 'user-123';

  beforeEach(() => {
    // Create mock Supabase instance
    mockSupabase = {
      rpc: mock(() => Promise.resolve({})),
      from: mock(() => mockSupabase),
      select: mock(() => mockSupabase),
      insert: mock(() => mockSupabase),
      update: mock(() => mockSupabase),
      eq: mock(() => mockSupabase),
      neq: mock(() => mockSupabase),
      order: mock(() => mockSupabase),
      limit: mock(() => mockSupabase),
      single: mock(() => Promise.resolve({ data: null, error: null }))
    };
  });

  describe('generateMemberId', () => {
    it('should generate member ID with YYYY format', async () => {
      // Mock no existing member IDs
      spyOn(mockSupabase, 'single')
        .mockImplementationOnce(() => Promise.resolve({ error: { code: 'PGRST116' } }))
        .mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

      const result = await MemberIdService.generateMemberId(
        mockGroupId,
        mockGroupUserId,
        'MEM-{YYYY}-{SEQ:3}'
      );

      const currentYear = new Date().getFullYear();
      expect(result).toBe(`MEM-${currentYear}-001`);
    });

    it('should generate member ID with YY format', async () => {
      spyOn(mockSupabase, 'single')
        .mockImplementationOnce(() => Promise.resolve({ error: { code: 'PGRST116' } }))
        .mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

      const result = await MemberIdService.generateMemberId(
        mockGroupId,
        mockGroupUserId,
        'MEM-{YY}-{SEQ:3}'
      );

      const shortYear = new Date().getFullYear().toString().slice(-2);
      expect(result).toBe(`MEM-${shortYear}-001`);
    });

    it('should generate member ID with full date format', async () => {
      spyOn(mockSupabase, 'single')
        .mockImplementationOnce(() => Promise.resolve({ error: { code: 'PGRST116' } }))
        .mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

      const result = await MemberIdService.generateMemberId(
        mockGroupId,
        mockGroupUserId,
        'MEM-{YYYY}{MM}{DD}-{SEQ:3}'
      );

      const now = new Date();
      const expected = `MEM-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-001`;
      expect(result).toBe(expected);
    });

    it('should increment sequence number based on last member ID', async () => {
      spyOn(mockSupabase, 'single')
        .mockImplementationOnce(() => Promise.resolve({
          data: { member_id: 'MEM-2024-005' },
          error: null
        }))
        .mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

      const result = await MemberIdService.generateMemberId(
        mockGroupId,
        mockGroupUserId,
        'MEM-{YYYY}-{SEQ:3}'
      );

      const currentYear = new Date().getFullYear();
      expect(result).toBe(`MEM-${currentYear}-006`);
    });

    it('should handle sequence without padding', async () => {
      spyOn(mockSupabase, 'single')
        .mockImplementationOnce(() => Promise.resolve({ error: { code: 'PGRST116' } }))
        .mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

      const result = await MemberIdService.generateMemberId(
        mockGroupId,
        mockGroupUserId,
        'MEM-{YYYY}-{SEQ}'
      );

      const currentYear = new Date().getFullYear();
      expect(result).toBe(`MEM-${currentYear}-1`);
    });

    it('should handle custom padding lengths', async () => {
      spyOn(mockSupabase, 'single')
        .mockImplementationOnce(() => Promise.resolve({ error: { code: 'PGRST116' } }))
        .mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

      const result = await MemberIdService.generateMemberId(
        mockGroupId,
        mockGroupUserId,
        'MEM-{YYYY}-{SEQ:5}'
      );

      const currentYear = new Date().getFullYear();
      expect(result).toBe(`MEM-${currentYear}-00001`);
    });

    it('should handle database errors', async () => {
      spyOn(mockSupabase, 'single').mockImplementationOnce(() => Promise.resolve({
        error: { code: 'OTHER_ERROR', message: 'Database error' }
      }));

      await expect(
        MemberIdService.generateMemberId(
          mockGroupId,
          mockGroupUserId,
          'MEM-{YYYY}-{SEQ:3}'
        )
      ).rejects.toThrow();
    });
  });

  describe('getMemberId', () => {
    it('should return existing member ID', async () => {
      spyOn(mockSupabase, 'single').mockImplementationOnce(() => Promise.resolve({
        data: { member_id: 'MEM-2024-001' },
        error: null
      }));

      const result = await MemberIdService.getMemberId(mockGroupUserId);
      expect(result).toBe('MEM-2024-001');
    });

    it('should return null when no member ID exists', async () => {
      spyOn(mockSupabase, 'single').mockImplementationOnce(() => Promise.resolve({
        error: { code: 'PGRST116' }
      }));

      const result = await MemberIdService.getMemberId(mockGroupUserId);
      expect(result).toBeNull();
    });
  });

  describe('setMemberId', () => {
    it('should set new member ID if it does not exist', async () => {
      spyOn(mockSupabase, 'single').mockImplementationOnce(() => Promise.resolve({
        error: { code: 'PGRST116' }
      }));
      spyOn(mockSupabase, 'insert').mockImplementationOnce(() => Promise.resolve({ error: null }));

      await expect(
        MemberIdService.setMemberId(mockGroupUserId, 'MEM-2024-001')
      ).resolves.not.toThrow();
    });

    it('should throw error if member ID already exists', async () => {
      spyOn(mockSupabase, 'single').mockImplementationOnce(() => Promise.resolve({
        data: { id: 'existing-id' },
        error: null
      }));

      await expect(
        MemberIdService.setMemberId(mockGroupUserId, 'MEM-2024-001')
      ).rejects.toThrow('Member ID already exists');
    });
  });

  describe('updateMemberId', () => {
    it('should update member ID if new ID does not exist', async () => {
      spyOn(mockSupabase, 'single').mockImplementationOnce(() => Promise.resolve({
        error: { code: 'PGRST116' }
      }));
      spyOn(mockSupabase, 'update').mockImplementationOnce(() => Promise.resolve({ error: null }));

      await expect(
        MemberIdService.updateMemberId(mockGroupUserId, 'MEM-2024-001')
      ).resolves.not.toThrow();
    });

    it('should throw error if new member ID already exists for different user', async () => {
      spyOn(mockSupabase, 'single').mockImplementationOnce(() => Promise.resolve({
        data: { group_user_id: 'other-user' },
        error: null
      }));

      await expect(
        MemberIdService.updateMemberId(mockGroupUserId, 'MEM-2024-001')
      ).rejects.toThrow('Member ID already exists');
    });
  });
}); 

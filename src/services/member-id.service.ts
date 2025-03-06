import { createClient } from "@/lib/utils/supabase/server";

// Standard date format tokens (similar to moment.js/date-fns)
const PLACEHOLDERS = {
  // Year
  YYYY: '{YYYY}',    // 4-digit year (e.g., 2024)
  YY: '{YY}',       // 2-digit year (e.g., 24)
  // Month
  MM: '{MM}',       // 2-digit month (01-12)
  M: '{M}',         // 1-digit month (1-12)
  // Day
  DD: '{DD}',       // 2-digit day (01-31)
  D: '{D}',         // 1-digit day (1-31)
} as const;

// Sequence format: {SEQ:n} where n is the padding length
const SEQ_PATTERN = /\{SEQ:(\d+)\}/;

interface MemberIdRecord {
  member_id: {
    member_id: string;
  };
}

export class MemberIdService {
  static async generateMemberId(
    groupId: string,
    format: string,
    groupUserId?: string
  ): Promise<string> {
    const supabase = await createClient();

    // Start a transaction to ensure atomicity
    await supabase.rpc('begin_transaction');

    try {
      // Extract format base (format without the sequence number)
      const formatBase = this.getFormatBase(format);
      
      // Get the latest member ID for this group and format to determine the next increment
      const { data: latestMemberIds, error: queryError } = await supabase
        .from('member_ids')
        .select('member_id')
        .eq('group_id', groupId)
        .like('member_id', this.getFormatBasePattern(formatBase) + '%')
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      // Generate the new member ID
      const now = new Date();
      let memberId = format;

      // Replace date placeholders
      memberId = memberId
        // Year
        .replace(PLACEHOLDERS.YYYY, now.getFullYear().toString())
        .replace(PLACEHOLDERS.YY, now.getFullYear().toString().slice(-2))
        // Month
        .replace(PLACEHOLDERS.MM, (now.getMonth() + 1).toString().padStart(2, '0'))
        .replace(PLACEHOLDERS.M, (now.getMonth() + 1).toString())
        // Day
        .replace(PLACEHOLDERS.DD, now.getDate().toString().padStart(2, '0'))
        .replace(PLACEHOLDERS.D, now.getDate().toString());

      // Calculate the format base with date substitutions
      const actualFormatBase = this.getFormatBase(memberId);

      // Determine the next increment for this specific format
      let increment = 1;
      if (latestMemberIds && latestMemberIds.length > 0) {
        // Find the highest sequence number for this format base
        const sequenceNumbers = latestMemberIds
          .filter(record => record.member_id.startsWith(actualFormatBase))
          .map(record => {
            const suffix = record.member_id.substring(actualFormatBase.length);
            const numberMatch = suffix.match(/^\d+$/);
            return numberMatch ? parseInt(numberMatch[0]) : 0;
          });
        
        if (sequenceNumbers.length > 0) {
          increment = Math.max(...sequenceNumbers) + 1;
        }
      }

      // Replace sequence placeholder with padded number
      // Look for sequence pattern with padding specification
      const seqMatch = format.match(SEQ_PATTERN);
      if (seqMatch) {
        const padding = parseInt(seqMatch[1]);
        memberId = memberId.replace(
          seqMatch[0],
          increment.toString().padStart(padding, '0')
        );
      } else {
        // Fallback to unpadded number if no padding specified
        memberId = memberId.replace('{SEQ}', increment.toString());
      }

      // Check if this member ID already exists for this group
      // This is a safety check to prevent duplicates
      const { data: existingId, error: existingIdError } = await supabase
        .from('member_ids')
        .select('id')
        .eq('group_id', groupId)
        .eq('member_id', memberId)
        .maybeSingle();

      if (existingIdError) {
        throw existingIdError;
      }

      // If a member ID already exists with this exact value, we need to increment again
      if (existingId) {
        // Recursively try again with incremented value
        await supabase.rpc('rollback_transaction');
        return this.generateMemberId(groupId, format, groupUserId);
      }

      // Insert the new member ID
      const { data: newMemberId, error: insertError } = await supabase
        .from('member_ids')
        .insert({
          group_id: groupId,
          member_id: memberId,
          group_user_id: groupUserId
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Commit the transaction
      await supabase.rpc('commit_transaction');

      return memberId;
    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  /**
   * Get the format base (format without the sequence part)
   * For example, "MEM-{YYYY}-{SEQ:3}" -> "MEM-{YYYY}-"
   */
  private static getFormatBase(format: string): string {
    // Replace SEQ pattern with empty string to get the base
    const seqMatch = format.match(SEQ_PATTERN);
    if (seqMatch) {
      return format.replace(seqMatch[0], '');
    }
    
    // Handle simple {SEQ} pattern
    return format.replace('{SEQ}', '');
  }

  /**
   * Get a SQL LIKE pattern for the format base
   * Escapes special characters and replaces date tokens with wildcards
   */
  private static getFormatBasePattern(formatBase: string): string {
    // Escape special characters for SQL LIKE pattern
    let pattern = formatBase
      .replace(/%/g, '\\%')  // Escape % for LIKE
      .replace(/_/g, '\\_'); // Escape _ for LIKE
    
    // Replace date placeholders with wildcards
    Object.values(PLACEHOLDERS).forEach(placeholder => {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      pattern = pattern.replace(regex, '%');
    });
    
    return pattern;
  }

  static async getMemberId(membershipId: string): Promise<string | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('membership_member_ids')
      .select(`
        member_id:member_ids!inner (
          member_id
        )
      `)
      .eq('membership_id', membershipId)
      .single() as { data: MemberIdRecord | null, error: any };

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data?.member_id.member_id || null;
  }

  static async assignMemberIdToMembership(
    membershipId: string,
    memberId: string
  ): Promise<void> {
    const supabase = await createClient();

    // Start a transaction
    await supabase.rpc('begin_transaction');

    try {
      // Check if this membership already has a member ID
      const { data: existingAssignment, error: checkError } = await supabase
        .from('membership_member_ids')
        .select('id')
        .eq('membership_id', membershipId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      // If an assignment already exists, update it instead of creating a new one
      if (existingAssignment) {
        await this.updateMembershipMemberId(membershipId, memberId);
        await supabase.rpc('commit_transaction');
        return;
      }

      // Get the member_id record
      const { data: memberIdRecord, error: memberIdError } = await supabase
        .from('member_ids')
        .select('id')
        .eq('member_id', memberId)
        .single();

      if (memberIdError) {
        throw memberIdError;
      }

      // Assign the member ID to the membership
      const { error: assignError } = await supabase
        .from('membership_member_ids')
        .insert({
          membership_id: membershipId,
          member_id_id: memberIdRecord.id
        });

      if (assignError) {
        throw assignError;
      }

      // Commit the transaction
      await supabase.rpc('commit_transaction');
    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  static async updateMembershipMemberId(
    membershipId: string,
    memberId: string
  ): Promise<void> {
    const supabase = await createClient();

    // Start a transaction
    await supabase.rpc('begin_transaction');

    try {
      // Get the member_id record
      const { data: memberIdRecord, error: memberIdError } = await supabase
        .from('member_ids')
        .select('id')
        .eq('member_id', memberId)
        .single();

      if (memberIdError) {
        throw memberIdError;
      }

      // Update the membership's member ID
      const { error: updateError } = await supabase
        .from('membership_member_ids')
        .update({ member_id_id: memberIdRecord.id })
        .eq('membership_id', membershipId);

      if (updateError) {
        throw updateError;
      }

      // Commit the transaction
      await supabase.rpc('commit_transaction');
    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  static async getMembershipsByMemberId(memberId: string): Promise<string[]> {
    const supabase = await createClient();

    // Get the member_id record first
    const { data: memberIdRecord, error: memberIdError } = await supabase
      .from('member_ids')
      .select('id')
      .eq('member_id', memberId)
      .single();

    if (memberIdError) {
      throw memberIdError;
    }

    // Get all memberships using this member ID
    const { data: memberships, error: membershipsError } = await supabase
      .from('membership_member_ids')
      .select('membership_id')
      .eq('member_id_id', memberIdRecord.id);

    if (membershipsError) {
      throw membershipsError;
    }

    return memberships.map(m => m.membership_id);
  }

  static async removeMemberIdFromMembership(membershipId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('membership_member_ids')
      .delete()
      .eq('membership_id', membershipId);

    if (error) {
      throw error;
    }
  }
} 

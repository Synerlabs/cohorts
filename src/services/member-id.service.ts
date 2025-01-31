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
    format: string
  ): Promise<string> {
    const supabase = await createClient();

    // Start a transaction to ensure atomicity
    await supabase.rpc('begin_transaction');

    try {
      // Get the latest member ID for this group to determine the next increment
      const { data: latestMemberId, error: queryError } = await supabase
        .from('member_ids')
        .select('member_id')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
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

      // Determine the next increment
      let increment = 1;
      if (latestMemberId) {
        // Extract the increment from the last member ID
        const match = latestMemberId.member_id.match(/\d+$/);
        if (match) {
          increment = parseInt(match[0]) + 1;
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

      // Insert the new member ID
      const { data: newMemberId, error: insertError } = await supabase
        .from('member_ids')
        .insert({
          group_id: groupId,
          member_id: memberId
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
  }

  static async updateMembershipMemberId(
    membershipId: string,
    memberId: string
  ): Promise<void> {
    const supabase = await createClient();

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

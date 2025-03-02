#!/usr/bin/env ts-node

/**
 * Script to reset group users, applications, and memberships
 * 
 * Usage:
 * - Reset all data for a specific group: ts-node src/scripts/reset-group-data.ts --group-id <group_id>
 * - Reset only specific data types: ts-node src/scripts/reset-group-data.ts --group-id <group_id> --reset-users --reset-applications --reset-memberships
 * - Get help: ts-node src/scripts/reset-group-data.ts --help
 */

import { createServiceRoleClient } from '../lib/utils/supabase/server';
import { Command } from 'commander';

// Define command line options
const program = new Command();
program
  .name('reset-group-data')
  .description('Reset group users, applications, and memberships')
  .requiredOption('--group-id <id>', 'Group ID to reset data for')
  .option('--reset-users', 'Reset group users', true)
  .option('--reset-applications', 'Reset applications', true)
  .option('--reset-memberships', 'Reset memberships', true)
  .option('--dry-run', 'Show what would be deleted without actually deleting', false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    console.log('Starting reset process...');
    
    if (options.dryRun) {
      console.log('DRY RUN MODE: No data will be deleted');
    }
    
    const groupId = options.groupId;
    console.log(`Target group ID: ${groupId}`);
    
    // Create Supabase client with service role for admin access
    const supabase = await createServiceRoleClient();
    
    // Verify the group exists
    const { data: group, error: groupError } = await supabase
      .from('group')
      .select('id, name')
      .eq('id', groupId)
      .single();
    
    if (groupError || !group) {
      console.error(`Error: Group with ID ${groupId} not found`);
      process.exit(1);
    }
    
    console.log(`Found group: ${group.name} (${group.id})`);
    
    // Get all group users for this group
    const { data: groupUsers, error: groupUsersError } = await supabase
      .from('group_users')
      .select('id, user_id')
      .eq('group_id', groupId);
    
    if (groupUsersError) {
      console.error('Error fetching group users:', groupUsersError.message);
      process.exit(1);
    }
    
    console.log(`Found ${groupUsers.length} group users`);
    
    // Get all group user IDs
    const groupUserIds = groupUsers.map(gu => gu.id);
    
    // Reset memberships if requested
    if (options.resetMemberships) {
      // Get count of memberships to delete
      const { count: membershipCount, error: countError } = await supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .in('group_user_id', groupUserIds);
      
      if (countError) {
        console.error('Error counting memberships:', countError.message);
      } else {
        console.log(`Found ${membershipCount} memberships to delete`);
        
        if (!options.dryRun && membershipCount && membershipCount > 0) {
          // First delete membership_role entries that reference memberships
          const { data: membershipIds } = await supabase
            .from('memberships')
            .select('id')
            .in('group_user_id', groupUserIds);
          
          if (membershipIds && membershipIds.length > 0) {
            const ids = membershipIds.map(m => m.id);
            
            // Delete membership_role entries
            const { error: membershipRoleError } = await supabase
              .from('membership_role')
              .delete()
              .in('membership_id', ids);
            
            if (membershipRoleError) {
              console.error('Error deleting membership roles:', membershipRoleError.message);
            } else {
              console.log(`Deleted membership roles for ${ids.length} memberships`);
            }
          }
          
          // Now delete the memberships
          const { error: deleteError } = await supabase
            .from('memberships')
            .delete()
            .in('group_user_id', groupUserIds);
          
          if (deleteError) {
            console.error('Error deleting memberships:', deleteError.message);
          } else {
            console.log(`Successfully deleted ${membershipCount} memberships`);
          }
        }
      }
    }
    
    // Reset applications if requested
    if (options.resetApplications) {
      // Get count of applications to delete
      const { count: applicationCount, error: countError } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .in('group_user_id', groupUserIds);
      
      if (countError) {
        console.error('Error counting applications:', countError.message);
      } else {
        console.log(`Found ${applicationCount} applications to delete`);
        
        if (!options.dryRun && applicationCount && applicationCount > 0) {
          const { error: deleteError } = await supabase
            .from('applications')
            .delete()
            .in('group_user_id', groupUserIds);
          
          if (deleteError) {
            console.error('Error deleting applications:', deleteError.message);
          } else {
            console.log(`Successfully deleted ${applicationCount} applications`);
          }
        }
      }
    }
    
    // Reset member IDs if they exist
    const { count: memberIdCount, error: countMemberIdError } = await supabase
      .from('member_ids')
      .select('id', { count: 'exact', head: true })
      .in('group_user_id', groupUserIds);
    
    if (countMemberIdError) {
      console.error('Error counting member IDs:', countMemberIdError.message);
    } else if (memberIdCount && memberIdCount > 0) {
      console.log(`Found ${memberIdCount} member IDs to delete`);
      
      if (!options.dryRun) {
        const { error: deleteMemberIdError } = await supabase
          .from('member_ids')
          .delete()
          .in('group_user_id', groupUserIds);
        
        if (deleteMemberIdError) {
          console.error('Error deleting member IDs:', deleteMemberIdError.message);
        } else {
          console.log(`Successfully deleted ${memberIdCount} member IDs`);
        }
      }
    }
    
    // Reset group users if requested
    if (options.resetUsers) {
      // Get user roles for these users in this group
      const { data: groupRoles } = await supabase
        .from('group_roles')
        .select('id')
        .eq('group_id', groupId);
      
      if (groupRoles && groupRoles.length > 0) {
        const groupRoleIds = groupRoles.map(role => role.id);
        
        // Get count of user roles to delete
        const { count: userRoleCount, error: countUserRoleError } = await supabase
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .in('group_role_id', groupRoleIds);
        
        if (countUserRoleError) {
          console.error('Error counting user roles:', countUserRoleError.message);
        } else if (userRoleCount && userRoleCount > 0) {
          console.log(`Found ${userRoleCount} user roles to delete`);
          
          if (!options.dryRun) {
            const { error: deleteUserRoleError } = await supabase
              .from('user_roles')
              .delete()
              .in('group_role_id', groupRoleIds);
            
            if (deleteUserRoleError) {
              console.error('Error deleting user roles:', deleteUserRoleError.message);
            } else {
              console.log(`Successfully deleted ${userRoleCount} user roles`);
            }
          }
        }
      }
      
      // Now delete the group users
      console.log(`Found ${groupUsers.length} group users to delete`);
      
      if (!options.dryRun && groupUsers.length > 0) {
        const { error: deleteError } = await supabase
          .from('group_users')
          .delete()
          .eq('group_id', groupId);
        
        if (deleteError) {
          console.error('Error deleting group users:', deleteError.message);
        } else {
          console.log(`Successfully deleted ${groupUsers.length} group users`);
        }
      }
    }
    
    console.log('Reset process completed successfully');
    
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 
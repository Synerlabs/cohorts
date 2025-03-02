#!/usr/bin/env ts-node

/**
 * Script to diagnose and fix form templates issues
 * 
 * Usage:
 * - Check form templates for a specific org: ts-node src/scripts/fix-form-templates.ts --org-id <org_id> --check
 * - Fix form templates for a specific org: ts-node src/scripts/fix-form-templates.ts --org-id <org_id> --fix
 * - Check a specific template: ts-node src/scripts/fix-form-templates.ts --template-id <template_id> --check
 * - Fix a specific template: ts-node src/scripts/fix-form-templates.ts --template-id <template_id> --fix
 * - Get help: ts-node src/scripts/fix-form-templates.ts --help
 */

import { createServiceRoleClient } from '../lib/utils/supabase/server';
import { Command } from 'commander';

// Define command line options
const program = new Command();
program
  .name('fix-form-templates')
  .description('Diagnose and fix form templates issues')
  .option('--org-id <id>', 'Organization ID to check/fix form templates for')
  .option('--template-id <id>', 'Specific template ID to check/fix')
  .option('--check', 'Check form templates without making changes', false)
  .option('--fix', 'Fix form templates issues', false)
  .option('--verbose', 'Show detailed information', false)
  .option('--restore-deleted', 'Restore deleted templates', false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    console.log('Starting form templates diagnosis...');
    
    const orgId = options.orgId;
    const templateId = options.templateId;
    const isCheckOnly = options.check;
    const isFixMode = options.fix;
    const isVerbose = options.verbose;
    const restoreDeleted = options.restoreDeleted;
    
    if (!isCheckOnly && !isFixMode) {
      console.error('Error: You must specify either --check or --fix');
      process.exit(1);
    }
    
    if (!orgId && !templateId) {
      console.error('Error: You must specify either --org-id or --template-id');
      process.exit(1);
    }
    
    // Create Supabase client with service role for admin access
    const supabase = await createServiceRoleClient();
    
    // If a specific template ID is provided, check/fix just that template
    if (templateId) {
      console.log(`Checking template with ID: ${templateId}`);
      
      // Get the template without any filters to see its raw state
      const { data: template, error: templateError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId);
      
      if (templateError) {
        console.error(`Error fetching template: ${templateError.message}`);
        process.exit(1);
      }
      
      if (!template || template.length === 0) {
        console.error(`Template with ID ${templateId} not found in the database.`);
        process.exit(1);
      }
      
      const templateData = template[0];
      console.log('Template found:');
      console.log(`- ID: ${templateData.id}`);
      console.log(`- Title: ${templateData.title}`);
      console.log(`- Organization ID: ${templateData.org_id}`);
      console.log(`- Status: ${templateData.status}`);
      console.log(`- is_deleted: ${templateData.is_deleted}`);
      console.log(`- deleted_at: ${templateData.deleted_at}`);
      console.log(`- deleted_by: ${templateData.deleted_by}`);
      
      // Check for inconsistencies
      const hasInconsistentDeletion = 
        (templateData.is_deleted && !templateData.deleted_at) || 
        (!templateData.is_deleted && templateData.deleted_at);
      
      if (hasInconsistentDeletion) {
        console.log('⚠️ Template has inconsistent deletion status!');
        
        if (isFixMode) {
          console.log('Fixing inconsistent deletion status...');
          
          // If template should be visible (not deleted)
          if (restoreDeleted || !templateData.is_deleted) {
            const { data: updatedTemplate, error: updateError } = await supabase
              .from('form_templates')
              .update({ 
                is_deleted: false, 
                deleted_at: null, 
                deleted_by: null 
              })
              .eq('id', templateId)
              .select();
            
            if (updateError) {
              console.error(`Error restoring template: ${updateError.message}`);
            } else {
              console.log('✅ Successfully restored template');
            }
          } 
          // If template should be deleted but has inconsistent status
          else if (templateData.is_deleted && !templateData.deleted_at) {
            const { data: updatedTemplate, error: updateError } = await supabase
              .from('form_templates')
              .update({ 
                deleted_at: new Date().toISOString()
              })
              .eq('id', templateId)
              .select();
            
            if (updateError) {
              console.error(`Error updating template deletion date: ${updateError.message}`);
            } else {
              console.log('✅ Successfully updated template deletion date');
            }
          }
        }
      } else if (templateData.is_deleted && restoreDeleted && isFixMode) {
        console.log('Template is marked as deleted. Restoring...');
        
        const { data: updatedTemplate, error: updateError } = await supabase
          .from('form_templates')
          .update({ 
            is_deleted: false, 
            deleted_at: null, 
            deleted_by: null 
          })
          .eq('id', templateId)
          .select();
        
        if (updateError) {
          console.error(`Error restoring template: ${updateError.message}`);
        } else {
          console.log('✅ Successfully restored template');
        }
      } else {
        console.log('✅ Template deletion status is consistent');
      }
      
      // Test if the template can be fetched with standard filters
      const { data: visibleTemplate, error: visibleError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId)
        .or('is_deleted.is.null,is_deleted.eq.false');
      
      if (visibleError) {
        console.error(`Error checking template visibility: ${visibleError.message}`);
      } else if (!visibleTemplate || visibleTemplate.length === 0) {
        console.log('⚠️ Template is not visible with standard filters (is_deleted is null or false)');
        
        if (isFixMode && !templateData.is_deleted) {
          console.log('Template should be visible but is not. Fixing...');
          
          const { data: updatedTemplate, error: updateError } = await supabase
            .from('form_templates')
            .update({ is_deleted: false })
            .eq('id', templateId)
            .select();
          
          if (updateError) {
            console.error(`Error updating template: ${updateError.message}`);
          } else {
            console.log('✅ Successfully updated template visibility');
          }
        }
      } else {
        console.log('✅ Template is visible with standard filters');
      }
      
      // Test if the template can be fetched with the deleted_at filter
      const { data: nonDeletedTemplate, error: nonDeletedError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId)
        .is('deleted_at', null);
      
      if (nonDeletedError) {
        console.error(`Error checking template deleted_at: ${nonDeletedError.message}`);
      } else if (!nonDeletedTemplate || nonDeletedTemplate.length === 0) {
        console.log('⚠️ Template is not visible with deleted_at is null filter');
        
        if (isFixMode && !templateData.is_deleted) {
          console.log('Template should be visible but deleted_at is not null. Fixing...');
          
          const { data: updatedTemplate, error: updateError } = await supabase
            .from('form_templates')
            .update({ deleted_at: null })
            .eq('id', templateId)
            .select();
          
          if (updateError) {
            console.error(`Error updating template: ${updateError.message}`);
          } else {
            console.log('✅ Successfully updated template deleted_at');
          }
        }
      } else {
        console.log('✅ Template is visible with deleted_at is null filter');
      }
      
      console.log('Template diagnosis completed');
      return;
    }
    
    // Organization-wide checks
    console.log(`Target organization ID: ${orgId}`);
    console.log(`Mode: ${isCheckOnly ? 'Check only' : 'Fix'}`);
    
    // Verify the organization exists
    const { data: org, error: orgError } = await supabase
      .from('group')
      .select('id, name')
      .eq('id', orgId)
      .single();
    
    if (orgError || !org) {
      console.error(`Error: Organization with ID ${orgId} not found`);
      process.exit(1);
    }
    
    console.log(`Found organization: ${org.name} (${org.id})`);
    
    // Check form templates
    console.log('Checking form templates...');
    
    // First, check the raw query without filters to see if any templates exist
    const { data: allTemplates, error: allTemplatesError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('org_id', orgId);
    
    if (allTemplatesError) {
      console.error('Error fetching all templates:', allTemplatesError.message);
      process.exit(1);
    }
    
    console.log(`Total templates found (without filters): ${allTemplates.length}`);
    
    if (isVerbose && allTemplates.length > 0) {
      console.log('Templates:');
      allTemplates.forEach(template => {
        console.log(`- ID: ${template.id}, Title: ${template.title}, Status: ${template.status}, is_deleted: ${template.is_deleted}, deleted_at: ${template.deleted_at}`);
      });
    }
    
    // Now check with the is_deleted filter
    const { data: visibleTemplates, error: visibleTemplatesError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('org_id', orgId)
      .or('is_deleted.is.null,is_deleted.eq.false');
    
    if (visibleTemplatesError) {
      console.error('Error fetching visible templates:', visibleTemplatesError.message);
      process.exit(1);
    }
    
    console.log(`Visible templates (is_deleted is null or false): ${visibleTemplates.length}`);
    
    // Check for templates with is_deleted = true
    const { data: deletedTemplates, error: deletedTemplatesError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', true);
    
    if (deletedTemplatesError) {
      console.error('Error fetching deleted templates:', deletedTemplatesError.message);
      process.exit(1);
    }
    
    console.log(`Deleted templates (is_deleted = true): ${deletedTemplates.length}`);
    
    // Check for templates with is_deleted = null
    const { data: nullDeletedTemplates, error: nullDeletedTemplatesError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('org_id', orgId)
      .is('is_deleted', null);
    
    if (nullDeletedTemplatesError) {
      console.error('Error fetching null deleted templates:', nullDeletedTemplatesError.message);
      process.exit(1);
    }
    
    console.log(`Templates with is_deleted = null: ${nullDeletedTemplates.length}`);
    
    // Check for templates with inconsistent deletion status
    const inconsistentTemplates = allTemplates.filter(template => 
      (template.is_deleted && !template.deleted_at) || 
      (!template.is_deleted && template.deleted_at)
    );
    
    if (inconsistentTemplates.length > 0) {
      console.log(`Found ${inconsistentTemplates.length} templates with inconsistent deletion status`);
      
      if (isVerbose) {
        inconsistentTemplates.forEach(template => {
          console.log(`- ID: ${template.id}, Title: ${template.title}, is_deleted: ${template.is_deleted}, deleted_at: ${template.deleted_at}`);
        });
      }
      
      if (isFixMode) {
        console.log('Fixing templates with inconsistent deletion status...');
        
        for (const template of inconsistentTemplates) {
          // If template should be visible (not deleted)
          if (restoreDeleted || !template.is_deleted) {
            const { data: updatedTemplate, error: updateError } = await supabase
              .from('form_templates')
              .update({ 
                is_deleted: false, 
                deleted_at: null, 
                deleted_by: null 
              })
              .eq('id', template.id)
              .select();
            
            if (updateError) {
              console.error(`Error restoring template ${template.id}: ${updateError.message}`);
            } else {
              console.log(`✅ Successfully restored template ${template.id}`);
            }
          } 
          // If template should be deleted but has inconsistent status
          else if (template.is_deleted && !template.deleted_at) {
            const { data: updatedTemplate, error: updateError } = await supabase
              .from('form_templates')
              .update({ 
                deleted_at: new Date().toISOString()
              })
              .eq('id', template.id)
              .select();
            
            if (updateError) {
              console.error(`Error updating template ${template.id} deletion date: ${updateError.message}`);
            } else {
              console.log(`✅ Successfully updated template ${template.id} deletion date`);
            }
          }
        }
      }
    } else {
      console.log('✅ No templates with inconsistent deletion status found');
    }
    
    // If in fix mode, update templates with is_deleted = null to is_deleted = false
    if (isFixMode && nullDeletedTemplates.length > 0) {
      console.log(`Fixing ${nullDeletedTemplates.length} templates with is_deleted = null...`);
      
      const { data: updatedTemplates, error: updateError } = await supabase
        .from('form_templates')
        .update({ is_deleted: false })
        .eq('org_id', orgId)
        .is('is_deleted', null)
        .select();
      
      if (updateError) {
        console.error('Error updating templates:', updateError.message);
      } else {
        console.log(`Successfully updated ${updatedTemplates.length} templates`);
      }
    }
    
    // Check for any other issues
    if (allTemplates.length === 0) {
      console.log('No templates found for this organization. You may need to create some templates.');
    } else if (visibleTemplates.length === 0 && deletedTemplates.length > 0) {
      console.log('All templates are marked as deleted. You may need to restore them or create new ones.');
      
      if (isFixMode && restoreDeleted) {
        const { data: restoredTemplates, error: restoreError } = await supabase
          .from('form_templates')
          .update({ is_deleted: false, deleted_at: null, deleted_by: null })
          .eq('org_id', orgId)
          .eq('is_deleted', true)
          .select();
        
        if (restoreError) {
          console.error('Error restoring templates:', restoreError.message);
        } else {
          console.log(`Successfully restored ${restoredTemplates.length} templates`);
        }
      }
    }
    
    // Final check after fixes
    if (isFixMode) {
      const { data: finalTemplates, error: finalError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('org_id', orgId)
        .or('is_deleted.is.null,is_deleted.eq.false');
      
      if (finalError) {
        console.error('Error fetching final templates:', finalError.message);
      } else {
        console.log(`After fixes, visible templates: ${finalTemplates.length}`);
      }
    }
    
    console.log('Diagnosis completed');
    
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 
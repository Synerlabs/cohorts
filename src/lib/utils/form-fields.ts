import { FormResponse } from "@/app/(authenticated)/[orgSlug]/(org-pages)/applications/[applicationId]/types";

export interface RepeatableField {
  index: number;
  fields: any[];
}

/**
 * Gets the value of a field from the form response
 */
export function getFieldValue(formResponse: FormResponse | null, fieldId: string, sectionId?: string): any {
  if (!formResponse) return null;
  
  try {
    console.log('Getting field value:', { fieldId, sectionId, responseData: formResponse.response_data });
    
    if (sectionId) {
      const sectionFields = formResponse.response_data.sections[sectionId]?.fields || {};
      console.log('Section fields:', { sectionId, fields: sectionFields });
      
      // If this is a direct field, return its value
      if (sectionFields[fieldId]?.value !== undefined) {
        return sectionFields[fieldId].value;
      }
      
      // If this is a group field, collect all fields that start with this ID
      const groupFields = Object.entries(sectionFields)
        .filter(([key]) => key.startsWith(`${fieldId}.`))
        .reduce((acc, [key, value]) => {
          // Extract the subfield ID (everything after the last dot)
          const subfieldId = key.split('.').pop() || '';
          acc[subfieldId] = value.value;
          return acc;
        }, {} as Record<string, any>);
      
      return Object.keys(groupFields).length > 0 ? groupFields : null;
    }
    
    const rootFields = formResponse.response_data.fields || {};
    console.log('Root fields:', { fieldId, fields: rootFields });
    
    // Same logic for root fields
    if (rootFields[fieldId]?.value !== undefined) {
      return rootFields[fieldId].value;
    }
    
    const groupFields = Object.entries(rootFields)
      .filter(([key]) => key.startsWith(`${fieldId}.`))
      .reduce((acc, [key, value]) => {
        const subfieldId = key.split('.').pop() || '';
        acc[subfieldId] = value.value;
        return acc;
      }, {} as Record<string, any>);
    
    return Object.keys(groupFields).length > 0 ? groupFields : null;
  } catch (error) {
    console.error(`Error getting field value for ${fieldId}:`, error);
    return null;
  }
}

/**
 * Gets all fields that belong to a repeatable field
 */
export function getRepeatableFields(formResponse: FormResponse | null, repeatableId: string, sectionId: string): RepeatableField[] {
  if (!formResponse) return [];

  try {
    // Get all fields that belong to this repeatable field
    const fields = formResponse.response_data.sections[sectionId]?.fields || {};
    const repeatableFields = Object.entries(fields)
      .filter(([key]) => key.startsWith(`${repeatableId}.`))
      .reduce((acc: Record<number, any[]>, [key, value]) => {
        const match = key.match(/^.+\.(\d+)\..+$/);
        if (match) {
          const index = parseInt(match[1]);
          if (!acc[index]) {
            acc[index] = [];
          }
          acc[index].push({ key, ...value });
        }
        return acc;
      }, {});

    return Object.entries(repeatableFields)
      .map(([index, fields]) => ({
        index: parseInt(index),
        fields,
      }))
      .sort((a, b) => a.index - b.index);
  } catch (error) {
    console.error(`Error getting repeatable fields for ${repeatableId}:`, error);
    return [];
  }
}

/**
 * Formats a field value based on its type
 */
export function formatFieldValue(value: any, type: string): string | null {
  if (value === null || value === undefined) return null;
  
  try {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      if (type === 'file') return value;
      return JSON.stringify(value);
    }
    return String(value);
  } catch (error) {
    console.error('Error formatting field value:', error);
    return null;
  }
} 
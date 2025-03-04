export interface GroupRole {
  id: string;
  group_id: string;
  role_name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  permissions: string[];
  type: 'group_role_type';
  // Membership specific fields
  price?: number;
  duration_months?: number;
  is_membership?: boolean;
}

export interface GroupUser {
  id: string;
  group_id: string;
  user_id: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
}

// New types for flexible organization structures
export interface OrganizationType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  metadataSchema: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Group (Organization) interface with type_code support
export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  created_by: string;
  parent_id: string | null;
  alternate_name: string | null;
  type: string | null;
  type_code: string | null; // References OrganizationType.code
  metadata?: Json; // Type-specific metadata
}

export interface RelationshipType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  metadata_schema: Json;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRelationship {
  id: number;
  parentOrganizationId: number;
  childOrganizationId: number;
  relationshipType: string;
  isPrimary: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationHierarchyView {
  parent_id: string;
  child_id: string;
  relationship_type_code: string;
  is_primary: boolean;
  status: string;
  parent_name: string;
  parent_type: string | null;
  child_name: string;
  child_type: string | null;
}

export interface OrganizationMembership {
  id: string;
  host_organization_id: string;
  member_organization_id: string;
  membership_tier_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  metadata: Record<string, any>;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface OrganizationMembershipView extends OrganizationMembership {
  host_organization_name: string;
  host_organization_slug: string;
  member_organization_name: string;
  member_organization_slug: string;
  membership_tier_name: string;
}

// Organization Requirements types
export interface OrganizationRequirement {
  id: number;
  organizationId: number;
  type: string;
  title: string;
  description: string | null;
  requiredFormId: number | null;
  requiredMembershipTierId: number | null;
  requiredChildrenCount: number | null;
  requiredParentRelationshipType: string | null;
  requirementOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Form system types
export interface OrganizationForm {
  id: number;
  organizationId: number;
  title: string;
  description: string | null;
  formSchema: Record<string, any>;
  formUiSchema: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: number;
  formId: number;
  submitterId: string;
  reviewerId: string | null;
  formData: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Form field type definitions for better typing
export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  label: string;
  required: boolean;
  options?: string[]; // For select, checkbox, radio
  helpText?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      group: {
        Row: {
          alternate_name: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          type: string | null
        }
        Insert: {
          alternate_name?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          type?: string | null
        }
        Update: {
          alternate_name?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          type?: string | null
        }
        Relationships: []
      }
      group_roles: {
        Row: {
          created_at: string
          group_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      group_users: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      membership: {
        Row: {
          activation_type: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_months: number
          group_id: string
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          activation_type?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_months?: number
          group_id: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          activation_type?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_months?: number
          group_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      membership_role: {
        Row: {
          created_at: string
          group_role_id: string
          id: string
          membership_id: string
        }
        Insert: {
          created_at?: string
          group_role_id: string
          id?: string
          membership_id: string
        }
        Update: {
          created_at?: string
          group_role_id?: string
          id?: string
          membership_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          group_role_id: string
          id: string
          permission: string
        }
        Insert: {
          created_at?: string
          group_role_id: string
          id?: string
          permission: string
        }
        Update: {
          created_at?: string
          group_role_id?: string
          id?: string
          permission?: string
        }
        Relationships: []
      }
      user_membership: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          group_id: string
          id: string
          is_active: boolean
          membership_id: string
          starts_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          membership_id: string
          starts_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          membership_id?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          group_role_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_role_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_role_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      applications_view: {
        Row: {
          id: string
          user_id: string
          membership_id: string
          group_id: string
          is_active: boolean
          created_at: string
          approved_at: string | null
          user_data: {
            id: string
            first_name: string | null
            last_name: string | null
            email: string
          }
          membership_data: {
            id: string
            name: string
            price: number
            activation_type: string | null
          }
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 
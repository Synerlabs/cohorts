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
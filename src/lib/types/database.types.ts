export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applications: {
        Row: {
          approved_at: string | null
          created_at: string
          form_data: Json | null
          form_response_id: string | null
          group_user_id: string
          id: string
          metadata: Json | null
          order_id: string | null
          rejected_at: string | null
          status: string
          tier_id: string
          type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          form_data?: Json | null
          form_response_id?: string | null
          group_user_id: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          rejected_at?: string | null
          status?: string
          tier_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          form_data?: Json | null
          form_response_id?: string | null
          group_user_id?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          rejected_at?: string | null
          status?: string
          tier_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_form_response_id_fkey"
            columns: ["form_response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_group_user_id_fkey"
            columns: ["group_user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_group_user_id_fkey"
            columns: ["group_user_id"]
            isOneToOne: false
            referencedRelation: "group_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "membership_applications_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_details: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_default: boolean | null
          order_id: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_default?: boolean | null
          order_id?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_default?: boolean | null
          order_id?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "membership_applications_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "billing_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      form_responses: {
        Row: {
          id: string
          ip_address: string | null
          response_data: Json
          submitted_at: string | null
          submitted_by: string | null
          template_id: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          response_data: Json
          submitted_at?: string | null
          submitted_by?: string | null
          template_id: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          response_data?: Json
          submitted_at?: string | null
          submitted_by?: string | null
          template_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "form_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_deleted: boolean | null
          org_id: string
          schema: Json
          settings: Json | null
          status: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          org_id: string
          schema: Json
          settings?: Json | null
          status?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          org_id?: string
          schema?: Json
          settings?: Json | null
          status?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "form_templates_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "form_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
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
          created_by: string
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
      group_organization: {
        Row: {
          child_group_id: string
          created_at: string
          id: string
          is_active: boolean
          parent_group_id: string
          tier_id: string
          updated_at: string
        }
        Insert: {
          child_group_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          parent_group_id: string
          tier_id: string
          updated_at?: string
        }
        Update: {
          child_group_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          parent_group_id?: string
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_organization_child_group_id_fkey"
            columns: ["child_group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_organization_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_organization_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["product_id"]
          },
        ]
      }
      group_payment_gateways: {
        Row: {
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          gateway_id: string
          group_id: string | null
          id: string
          status: Database["public"]["Enums"]["payment_gateway_status"] | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          gateway_id: string
          group_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["payment_gateway_status"] | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          gateway_id?: string
          group_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["payment_gateway_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_payment_gateways_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      group_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          group_id: string | null
          id: string
          is_super_admin: boolean
          permissions: string[] | null
          role_name: string | null
          type: Database["public"]["Enums"]["group_role_type"] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_super_admin?: boolean
          permissions?: string[] | null
          role_name?: string | null
          type?: Database["public"]["Enums"]["group_role_type"] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_super_admin?: boolean
          permissions?: string[] | null
          role_name?: string | null
          type?: Database["public"]["Enums"]["group_role_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "group_roles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      group_users: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_active: boolean
          is_deleted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_users_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "group_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_metadata: {
        Row: {
          auth_token: string | null
          created_at: string | null
          custom_message: string | null
          email: string
          group_id: string
          id: string
          invited_by: string | null
          metadata: Json | null
          role: string | null
          status: string
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          auth_token?: string | null
          created_at?: string | null
          custom_message?: string | null
          email: string
          group_id: string
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          role?: string | null
          status?: string
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          auth_token?: string | null
          created_at?: string | null
          custom_message?: string | null
          email?: string
          group_id?: string
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          role?: string | null
          status?: string
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_metadata_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_metadata_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          notes: string | null
          payment_id: string
        }
        Insert: {
          notes?: string | null
          payment_id: string
        }
        Update: {
          notes?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      member_ids: {
        Row: {
          created_at: string
          group_id: string | null
          group_user_id: string | null
          id: string
          member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          group_user_id?: string | null
          id?: string
          member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          group_user_id?: string | null
          id?: string
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_ids_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_member_ids: {
        Row: {
          created_at: string
          id: string
          member_id_id: string | null
          membership_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id_id?: string | null
          membership_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id_id?: string | null
          membership_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_member_ids_member_id_id_fkey"
            columns: ["member_id_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["member_ids_record_id"]
          },
          {
            foreignKeyName: "membership_member_ids_member_id_id_fkey"
            columns: ["member_id_id"]
            isOneToOne: false
            referencedRelation: "member_ids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_member_ids_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "membership_roles_view"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "membership_member_ids_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_tier_roles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          group_role_id: string
          id: string
          tier_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          group_role_id: string
          id?: string
          tier_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          group_role_id?: string
          id?: string
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_tier_roles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "membership_tier_roles_group_role_id_fkey"
            columns: ["group_role_id"]
            isOneToOne: false
            referencedRelation: "group_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_tier_roles_group_role_id_fkey"
            columns: ["group_role_id"]
            isOneToOne: false
            referencedRelation: "membership_roles_view"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "membership_tier_roles_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["product_id"]
          },
        ]
      }
      membership_tier_settings: {
        Row: {
          created_at: string
          id: string
          member_id_format: string
          tier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id_format?: string
          tier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id_format?: string
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_tier_settings_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: true
            referencedRelation: "membership_tiers"
            referencedColumns: ["product_id"]
          },
        ]
      }
      membership_tiers: {
        Row: {
          activation_type: string
          duration_months: number
          duration_unit: string
          fiscal_start_day: number | null
          fiscal_start_month: number | null
          fixed_end_date: string | null
          fixed_start_date: string | null
          form_template_id: string | null
          has_fixed_dates: boolean
          has_monthly_cycle: boolean
          is_fiscal_period: boolean
          monthly_end_day: number | null
          monthly_end_day_type: string
          monthly_start_day: number | null
          product_id: string
          type: string
        }
        Insert: {
          activation_type: string
          duration_months?: number
          duration_unit?: string
          fiscal_start_day?: number | null
          fiscal_start_month?: number | null
          fixed_end_date?: string | null
          fixed_start_date?: string | null
          form_template_id?: string | null
          has_fixed_dates?: boolean
          has_monthly_cycle?: boolean
          is_fiscal_period?: boolean
          monthly_end_day?: number | null
          monthly_end_day_type?: string
          monthly_start_day?: number | null
          product_id: string
          type?: string
        }
        Update: {
          activation_type?: string
          duration_months?: number
          duration_unit?: string
          fiscal_start_day?: number | null
          fiscal_start_month?: number | null
          fixed_end_date?: string | null
          fixed_start_date?: string | null
          form_template_id?: string | null
          has_fixed_dates?: boolean
          has_monthly_cycle?: boolean
          is_fiscal_period?: boolean
          monthly_end_day?: number | null
          monthly_end_day_type?: string
          monthly_start_day?: number | null
          product_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_tiers_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          end_date: string | null
          group_user_id: string
          id: string
          metadata: Json | null
          order_id: string
          start_date: string | null
          status: string
          tier_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          group_user_id: string
          id?: string
          metadata?: Json | null
          order_id: string
          start_date?: string | null
          status?: string
          tier_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          group_user_id?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          start_date?: string | null
          status?: string
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_group_user_id_fkey"
            columns: ["group_user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_group_user_id_fkey"
            columns: ["group_user_id"]
            isOneToOne: false
            referencedRelation: "group_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "membership_applications_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "memberships_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["product_id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          group_id: string | null
          id: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency: string
          group_id?: string | null
          id?: string
          status: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          group_id?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      org_storage_settings: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          org_id: string
          provider_type: Database["public"]["Enums"]["storage_provider_type"]
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          org_id: string
          provider_type?: Database["public"]["Enums"]["storage_provider_type"]
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          org_id?: string
          provider_type?: Database["public"]["Enums"]["storage_provider_type"]
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_storage_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_uploads: {
        Row: {
          created_at: string | null
          payment_id: string
          upload_id: string
        }
        Insert: {
          created_at?: string | null
          payment_id: string
          upload_id: string
        }
        Update: {
          created_at?: string | null
          payment_id?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_uploads_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_uploads_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          group_id: string | null
          id: string
          order_id: string
          status: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          group_id?: string | null
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          group_id?: string | null
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "membership_applications_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          group_id: string | null
          id: string
          is_active: boolean
          is_deleted: boolean | null
          name: string
          price: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean | null
          name: string
          price?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean | null
          name?: string
          price?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "products_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      stripe_connected_accounts: {
        Row: {
          account_id: string | null
          capabilities_status: Json | null
          charges_enabled: boolean | null
          country: string
          created_at: string | null
          disabled_reason: string | null
          has_external_account: boolean | null
          id: string
          is_active: boolean | null
          is_test_mode: boolean | null
          last_synced_at: string | null
          org_id: string
          payouts_enabled: boolean | null
          requirements_due_date: string | null
          requirements_status: Json | null
          updated_at: string | null
          verification_status: Json | null
        }
        Insert: {
          account_id?: string | null
          capabilities_status?: Json | null
          charges_enabled?: boolean | null
          country: string
          created_at?: string | null
          disabled_reason?: string | null
          has_external_account?: boolean | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_synced_at?: string | null
          org_id: string
          payouts_enabled?: boolean | null
          requirements_due_date?: string | null
          requirements_status?: Json | null
          updated_at?: string | null
          verification_status?: Json | null
        }
        Update: {
          account_id?: string | null
          capabilities_status?: Json | null
          charges_enabled?: boolean | null
          country?: string
          created_at?: string | null
          disabled_reason?: string | null
          has_external_account?: boolean | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_synced_at?: string | null
          org_id?: string
          payouts_enabled?: boolean | null
          requirements_due_date?: string | null
          requirements_status?: Json | null
          updated_at?: string | null
          verification_status?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connected_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_payments: {
        Row: {
          payment_id: string
          stripe_account_id: string | null
          stripe_payment_intent_client_secret: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method: string | null
          stripe_status: string | null
        }
        Insert: {
          payment_id: string
          stripe_account_id?: string | null
          stripe_payment_intent_client_secret?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method?: string | null
          stripe_status?: string | null
        }
        Update: {
          payment_id?: string
          stripe_account_id?: string | null
          stripe_payment_intent_client_secret?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method?: string | null
          stripe_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_settings: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          is_test_mode: boolean | null
          org_id: string
          refresh_url: string | null
          return_url: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          is_test_mode?: boolean | null
          org_id: string
          refresh_url?: string | null
          return_url?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          is_test_mode?: boolean | null
          org_id?: string
          refresh_url?: string | null
          return_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      suborders: {
        Row: {
          amount: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          currency: string
          failed_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          product_id: string
          status: Database["public"]["Enums"]["suborder_status"]
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          product_id: string
          status?: Database["public"]["Enums"]["suborder_status"]
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          product_id?: string
          status?: Database["public"]["Enums"]["suborder_status"]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suborders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "membership_applications_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "suborders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suborders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          created_at: string | null
          file_id: string | null
          file_url: string
          id: string
          module: string
          original_filename: string
          storage_path: string
          storage_provider: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_id?: string | null
          file_url: string
          id?: string
          module: string
          original_filename: string
          storage_path: string
          storage_provider: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_id?: string | null
          file_url?: string
          id?: string
          module?: string
          original_filename?: string
          storage_path?: string
          storage_provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          group_role_id: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_role_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_role_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_group_role_id_fkey"
            columns: ["group_role_id"]
            isOneToOne: false
            referencedRelation: "group_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_group_role_id_fkey"
            columns: ["group_role_id"]
            isOneToOne: false
            referencedRelation: "membership_roles_view"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xendit_connected_accounts: {
        Row: {
          account_id: string
          capabilities_status: Json | null
          charges_enabled: boolean | null
          created_at: string | null
          disabled_reason: string | null
          has_external_account: boolean | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          org_id: string | null
          payouts_enabled: boolean | null
          requirements_due_date: string | null
          requirements_status: Json | null
          updated_at: string | null
          verification_status: Json | null
        }
        Insert: {
          account_id: string
          capabilities_status?: Json | null
          charges_enabled?: boolean | null
          created_at?: string | null
          disabled_reason?: string | null
          has_external_account?: boolean | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          org_id?: string | null
          payouts_enabled?: boolean | null
          requirements_due_date?: string | null
          requirements_status?: Json | null
          updated_at?: string | null
          verification_status?: Json | null
        }
        Update: {
          account_id?: string
          capabilities_status?: Json | null
          charges_enabled?: boolean | null
          created_at?: string | null
          disabled_reason?: string | null
          has_external_account?: boolean | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          org_id?: string | null
          payouts_enabled?: boolean | null
          requirements_due_date?: string | null
          requirements_status?: Json | null
          updated_at?: string | null
          verification_status?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "xendit_connected_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      xendit_payments: {
        Row: {
          created_at: string | null
          payment_id: string
          payment_method: string | null
          updated_at: string | null
          xendit_invoice_id: string
          xendit_status: string
        }
        Insert: {
          created_at?: string | null
          payment_id: string
          payment_method?: string | null
          updated_at?: string | null
          xendit_invoice_id: string
          xendit_status: string
        }
        Update: {
          created_at?: string | null
          payment_id?: string
          payment_method?: string | null
          updated_at?: string | null
          xendit_invoice_id?: string
          xendit_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "xendit_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      group_members_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          group_id: string | null
          id: string | null
          is_active: boolean | null
          is_deleted: boolean | null
          last_name: string | null
          member_id: string | null
          member_ids_record_id: string | null
          profile_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_users_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_applications_view: {
        Row: {
          activation_type: string | null
          amount: number | null
          application_id: string | null
          approved_at: string | null
          currency: string | null
          duration_months: number | null
          end_date: string | null
          group_id: string | null
          group_user_id: string | null
          id: string | null
          order_id: string | null
          order_status: string | null
          payment_completed_at: string | null
          product_currency: string | null
          product_description: string | null
          product_id: string | null
          product_name: string | null
          product_price: number | null
          rejected_at: string | null
          start_date: string | null
          status: string | null
          submitted_at: string | null
          type: string | null
          updated_at: string | null
          user_data: Json | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_group_user_id_fkey"
            columns: ["group_user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_group_user_id_fkey"
            columns: ["group_user_id"]
            isOneToOne: false
            referencedRelation: "group_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_tier_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_users_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "group_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_roles_view: {
        Row: {
          end_date: string | null
          group_id: string | null
          membership_id: string | null
          membership_status: string | null
          permissions: string[] | null
          role_id: string | null
          role_name: string | null
          start_date: string | null
          tier_name: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_roles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "group_members_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "group_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_application: {
        Args: {
          p_application_id: string
          p_new_status: string
          p_should_activate: boolean
          p_approved_at: string
        }
        Returns: undefined
      }
      calculate_membership_end_date: {
        Args: { p_tier_id: string; p_start_date: string }
        Returns: string
      }
      complete_payment: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      generate_member_id: {
        Args: { p_group_id: string; p_format: string }
        Returns: string
      }
      get_group_members: {
        Args: { group_id: string }
        Returns: {
          id: string
          created_at: string
          user_id: string
          email: string
          first_name: string
          last_name: string
          avatar_url: string
        }[]
      }
      reject_application: {
        Args: { p_application_id: string; p_rejected_at: string }
        Returns: undefined
      }
      search_auth_user_by_email: {
        Args: { email_param: string }
        Returns: string
      }
      sync_profile_emails: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      app_permission:
        | "group.edit"
        | "group.delete"
        | "group.members.invite"
        | "group.members.approve"
      group_role_type: "GUEST" | "MEMBER"
      manual_payment_status: "pending" | "approved" | "rejected"
      membership_activation_type:
        | "automatic"
        | "review_required"
        | "payment_required"
        | "review_then_payment"
        | "form_required"
        | "form_then_payment"
        | "form_then_review"
        | "form_then_payment_then_review"
        | "form_then_review_then_payment"
      payment_gateway_status:
        | "unconfigured"
        | "configured"
        | "disabled"
        | "error"
      payment_status:
        | "pending"
        | "paid"
        | "rejected"
        | "initialized"
        | "pending_approval"
      payment_type: "manual" | "stripe" | "xendit"
      storage_provider_type: "google-drive" | "blob-storage"
      suborder_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_permission: [
        "group.edit",
        "group.delete",
        "group.members.invite",
        "group.members.approve",
      ],
      group_role_type: ["GUEST", "MEMBER"],
      manual_payment_status: ["pending", "approved", "rejected"],
      membership_activation_type: [
        "automatic",
        "review_required",
        "payment_required",
        "review_then_payment",
        "form_required",
        "form_then_payment",
        "form_then_review",
        "form_then_payment_then_review",
        "form_then_review_then_payment",
      ],
      payment_gateway_status: [
        "unconfigured",
        "configured",
        "disabled",
        "error",
      ],
      payment_status: [
        "pending",
        "paid",
        "rejected",
        "initialized",
        "pending_approval",
      ],
      payment_type: ["manual", "stripe", "xendit"],
      storage_provider_type: ["google-drive", "blob-storage"],
      suborder_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const


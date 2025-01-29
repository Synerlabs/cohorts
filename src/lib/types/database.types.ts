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
          group_user_id: string
          id: string
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
          group_user_id: string
          id?: string
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
          group_user_id?: string
          id?: string
          order_id?: string | null
          rejected_at?: string | null
          status?: string
          tier_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
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
      group_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          group_id: string | null
          id: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_active?: boolean
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          group_user_id: string
          id: string
          member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_user_id: string
          id?: string
          member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_user_id?: string
          id?: string
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_ids_group_user_id_fkey"
            columns: ["group_user_id"]
            isOneToOne: false
            referencedRelation: "group_users"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_tiers: {
        Row: {
          activation_type: string
          duration_months: number
          product_id: string
        }
        Insert: {
          activation_type: string
          duration_months?: number
          product_id: string
        }
        Update: {
          activation_type?: string
          duration_months?: number
          product_id?: string
        }
        Relationships: [
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
          end_date: string | null
          group_user_id: string
          metadata: Json | null
          order_id: string
          start_date: string | null
          status: string
        }
        Insert: {
          end_date?: string | null
          group_user_id: string
          metadata?: Json | null
          order_id: string
          start_date?: string | null
          status?: string
        }
        Update: {
          end_date?: string | null
          group_user_id?: string
          metadata?: Json | null
          order_id?: string
          start_date?: string | null
          status?: string
        }
        Relationships: [
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
            referencedRelation: "orders"
            referencedColumns: ["id"]
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
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          group_id: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
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
      stripe_connected_accounts: {
        Row: {
          account_id: string | null
          account_status:
            | Database["public"]["Enums"]["stripe_account_status"]
            | null
          country: string
          created_at: string | null
          id: string
          is_test_mode: boolean | null
          org_id: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          account_status?:
            | Database["public"]["Enums"]["stripe_account_status"]
            | null
          country: string
          created_at?: string | null
          id?: string
          is_test_mode?: boolean | null
          org_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          account_status?:
            | Database["public"]["Enums"]["stripe_account_status"]
            | null
          country?: string
          created_at?: string | null
          id?: string
          is_test_mode?: boolean | null
          org_id?: string
          updated_at?: string | null
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
          stripe_payment_intent_id: string | null
          stripe_payment_method: string | null
          stripe_status: string | null
        }
        Insert: {
          payment_id: string
          stripe_payment_intent_id?: string | null
          stripe_payment_method?: string | null
          stripe_status?: string | null
        }
        Update: {
          payment_id?: string
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
          id: string;
          order_id: string;
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          product_id: string;
          amount: number;
          currency: string;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          failed_at: string | null;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          product_id: string;
          amount: number;
          currency: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          failed_at?: string | null;
          cancelled_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          product_id?: string;
          amount?: number;
          currency?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          failed_at?: string | null;
          cancelled_at?: string | null;
        };
        Relationships: [
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
          }
        ];
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
        ]
      }
    }
    Views: {
      membership_applications_view: {
        Row: {
          activation_type: string | null
          approved_at: string | null
          duration_months: number | null
          group_id: string | null
          group_name: string | null
          group_slug: string | null
          group_user_id: string | null
          id: string | null
          order_data: Json | null
          order_id: string | null
          product_currency: string | null
          product_data: Json | null
          product_id: string | null
          product_name: string | null
          product_price: number | null
          rejected_at: string | null
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
            referencedRelation: "group_users"
            referencedColumns: ["id"]
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
      complete_payment: {
        Args: {
          p_application_id: string
        }
        Returns: undefined
      }
      get_group_members: {
        Args: {
          group_id: string
        }
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
        Args: {
          p_application_id: string
          p_rejected_at: string
        }
        Returns: undefined
      }
      begin_transaction: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      commit_transaction: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      rollback_transaction: {
        Args: Record<string, never>;
        Returns: undefined;
      };
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
      payment_status: "pending" | "paid" | "rejected"
      payment_type: "manual" | "stripe"
      storage_provider_type: "google-drive" | "blob-storage"
      stripe_account_status: "pending" | "active" | "disconnected"
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never


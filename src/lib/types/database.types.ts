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
          order_id: string
          start_date: string | null
        }
        Insert: {
          end_date?: string | null
          group_user_id: string
          order_id: string
          start_date?: string | null
        }
        Update: {
          end_date?: string | null
          group_user_id?: string
          order_id?: string
          start_date?: string | null
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
        ]
      }
      orders: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          product_id: string
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
          id?: string
          product_id: string
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
          id?: string
          product_id?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          amount: number | null
          application_id: string | null
          application_status: string | null
          approved_at: string | null
          currency: string | null
          duration_months: number | null
          end_date: string | null
          group_id: string | null
          group_user_id: string | null
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
        }
        Returns: undefined
      }
    }
    Enums: {
      app_permission:
        | "group.edit"
        | "group.delete"
        | "group.members.invite"
        | "group.members.approve"
      group_role_type: "GUEST" | "MEMBER"
      membership_activation_type:
        | "automatic"
        | "review_required"
        | "payment_required"
        | "review_then_payment"
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


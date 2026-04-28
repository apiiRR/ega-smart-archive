export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: number
          ip_address: string | null
          module: string
          new_state: string | null
          old_state: string | null
          target_id: string | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: number
          ip_address?: string | null
          module: string
          new_state?: string | null
          old_state?: string | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: number
          ip_address?: string | null
          module?: string
          new_state?: string | null
          old_state?: string | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      directorates: {
        Row: {
          created_at: string
          director_name: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          director_name: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          director_name?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      disposition_reads: {
        Row: {
          disposition_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          disposition_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          disposition_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disposition_reads_disposition_id_fkey"
            columns: ["disposition_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositions: {
        Row: {
          catatan: string
          created_at: string
          from_user_id: string
          id: string
          parent_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          surat_internal_id: string | null
          surat_keluar_id: string | null
          surat_masuk_id: string | null
          to_division_id: string
          to_user_id: string | null
        }
        Insert: {
          catatan: string
          created_at?: string
          from_user_id: string
          id?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          surat_internal_id?: string | null
          surat_keluar_id?: string | null
          surat_masuk_id?: string | null
          to_division_id: string
          to_user_id?: string | null
        }
        Update: {
          catatan?: string
          created_at?: string
          from_user_id?: string
          id?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          surat_internal_id?: string | null
          surat_keluar_id?: string | null
          surat_masuk_id?: string | null
          to_division_id?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositions_surat_internal_id_fkey"
            columns: ["surat_internal_id"]
            isOneToOne: false
            referencedRelation: "surat_internal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositions_surat_keluar_id_fkey"
            columns: ["surat_keluar_id"]
            isOneToOne: false
            referencedRelation: "surat_keluar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositions_surat_masuk_id_fkey"
            columns: ["surat_masuk_id"]
            isOneToOne: false
            referencedRelation: "surat_masuk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositions_to_division_id_fkey"
            columns: ["to_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          created_at: string
          directorate_id: string
          gm_user_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          directorate_id: string
          gm_user_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          directorate_id?: string
          gm_user_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_directorate_id_fkey"
            columns: ["directorate_id"]
            isOneToOne: false
            referencedRelation: "directorates"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_reads: {
        Row: {
          id: string
          read_at: string
          read_type: string
          surat_internal_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          read_at?: string
          read_type: string
          surat_internal_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          read_at?: string
          read_type?: string
          surat_internal_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "letter_reads_surat_internal_id_fkey"
            columns: ["surat_internal_id"]
            isOneToOne: false
            referencedRelation: "surat_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          dynamic_fields: Json | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          dynamic_fields?: Json | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          dynamic_fields?: Json | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      menus: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          label: string
          name: string
          parent_id: string | null
          path: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          name: string
          parent_id?: string | null
          path: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          name?: string
          parent_id?: string | null
          path?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          id: string
          menu_id: string
        }
        Insert: {
          action: string
          id?: string
          menu_id: string
        }
        Update: {
          action?: string
          id?: string
          menu_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          division_id: string | null
          email: string
          id: string
          name: string
          nip: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          division_id?: string | null
          email: string
          id: string
          name: string
          nip?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          division_id?: string | null
          email?: string
          id?: string
          name?: string
          nip?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          data_scope: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          data_scope?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          data_scope?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      surat_internal: {
        Row: {
          created_at: string
          created_by: string
          file_url: string | null
          id: string
          isi_surat: string | null
          nama_surat: string
          nomor_surat: string
          perihal: string
          status: Database["public"]["Enums"]["document_status"]
          tebusan: Json
          template_id: string | null
          tujuan: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          file_url?: string | null
          id?: string
          isi_surat?: string | null
          nama_surat: string
          nomor_surat: string
          perihal: string
          status?: Database["public"]["Enums"]["document_status"]
          tebusan?: Json
          template_id?: string | null
          tujuan?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          file_url?: string | null
          id?: string
          isi_surat?: string | null
          nama_surat?: string
          nomor_surat?: string
          perihal?: string
          status?: Database["public"]["Enums"]["document_status"]
          tebusan?: Json
          template_id?: string | null
          tujuan?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surat_internal_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "letter_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      surat_keluar: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string
          file_url: string | null
          id: string
          isi_surat: string | null
          nama_surat: string
          nomor_surat: string
          perihal: string
          status: Database["public"]["Enums"]["document_status"]
          template_id: string | null
          tujuan: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by: string
          file_url?: string | null
          id?: string
          isi_surat?: string | null
          nama_surat: string
          nomor_surat: string
          perihal: string
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          tujuan: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string
          file_url?: string | null
          id?: string
          isi_surat?: string | null
          nama_surat?: string
          nomor_surat?: string
          perihal?: string
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          tujuan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surat_keluar_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "letter_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      surat_masuk: {
        Row: {
          asal_surat: string
          catatan: string | null
          created_at: string
          created_by: string
          file_url: string | null
          id: string
          nama_surat: string
          nomor_surat: string
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }
        Insert: {
          asal_surat: string
          catatan?: string | null
          created_at?: string
          created_by: string
          file_url?: string | null
          id?: string
          nama_surat: string
          nomor_surat: string
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Update: {
          asal_surat?: string
          catatan?: string | null
          created_at?: string
          created_by?: string
          file_url?: string | null
          id?: string
          nama_surat?: string
          nomor_surat?: string
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_unread_dispositions: { Args: { _user_id: string }; Returns: number }
      get_disposition_letter_details: {
        Args: { _disposition_id: string }
        Returns: Json
      }
      get_surat_internal_read_status: {
        Args: { _surat_id: string }
        Returns: {
          division_id: string
          division_name: string
          first_read_at: string
          last_read_at: string
          read_users: number
          recipient_type: string
          total_users: number
        }[]
      }
      get_user_division_id: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: { _action: string; _menu_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _details?: Json
          _module: string
          _new_state?: string
          _old_state?: string
          _target_id?: string
          _target_table?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "direktur"
        | "general_manager"
        | "pegawai"
      document_status: "draft" | "confirm"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "admin",
        "direktur",
        "general_manager",
        "pegawai",
      ],
      document_status: ["draft", "confirm"],
    },
  },
} as const

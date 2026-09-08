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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      books: {
        Row: {
          author: string
          created_at: string
          department: Database["public"]["Enums"]["department"]
          featured: boolean
          id: string
          kept_at: string | null
          kept_by_name: string | null
          kind: string
          pages: number
          private_for: string | null
          publisher_id: string | null
          review: string | null
          shelf: string | null
          shelf_mark: string
          spine_color: string
          status: Database["public"]["Enums"]["book_status"]
          title: string
          year: number
        }
        Insert: {
          author: string
          created_at?: string
          department: Database["public"]["Enums"]["department"]
          featured?: boolean
          id?: string
          kept_at?: string | null
          kept_by_name?: string | null
          kind: string
          pages: number
          private_for?: string | null
          publisher_id?: string | null
          review?: string | null
          shelf?: string | null
          shelf_mark?: string
          spine_color?: string
          status?: Database["public"]["Enums"]["book_status"]
          title: string
          year: number
        }
        Update: {
          author?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"]
          featured?: boolean
          id?: string
          kept_at?: string | null
          kept_by_name?: string | null
          kind?: string
          pages?: number
          private_for?: string | null
          publisher_id?: string | null
          review?: string | null
          shelf?: string | null
          shelf_mark?: string
          spine_color?: string
          status?: Database["public"]["Enums"]["book_status"]
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      keep_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          loan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          loan_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          loan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keep_requests_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          book_id: string
          bookmark_page: number | null
          current_page: number
          ends_at: string
          id: string
          pages: Json
          started_at: string
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        Insert: {
          book_id: string
          bookmark_page?: number | null
          current_page?: number
          ends_at?: string
          id?: string
          pages?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        Update: {
          book_id?: string
          bookmark_page?: number | null
          current_page?: number
          ends_at?: string
          id?: string
          pages?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["loan_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          card_number: string
          display_name: string | null
          issued_at: string
          user_id: string
        }
        Insert: {
          card_number: string
          display_name?: string | null
          issued_at?: string
          user_id: string
        }
        Update: {
          card_number?: string
          display_name?: string | null
          issued_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publishers: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
          style_note: string | null
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          name: string
          style_note?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
          style_note?: string | null
        }
        Relationships: []
      }
      reader_shelf_state: {
        Row: {
          created_at: string
          generated_at: string | null
          note: string | null
          signal_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          note?: string | null
          signal_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          note?: string | null
          signal_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reader_signals: {
        Row: {
          book_id: string | null
          created_at: string
          department: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_signals_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      book_status: "available" | "taken_forever"
      department:
        | "novels"
        | "poetry"
        | "treatises"
        | "sciences"
        | "memoirs"
        | "reference"
        | "restricted"
      loan_status: "active" | "returned" | "kept"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      book_status: ["available", "taken_forever"],
      department: [
        "novels",
        "poetry",
        "treatises",
        "sciences",
        "memoirs",
        "reference",
        "restricted",
      ],
      loan_status: ["active", "returned", "kept"],
    },
  },
} as const

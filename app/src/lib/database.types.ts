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
      sales_activity: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "sales_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_assessment_notes: {
        Row: {
          assessment_id: string
          author_id: string
          body: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_assessment_notes_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "sales_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_assessment_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "sales_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_assessments: {
        Row: {
          brief_input_ready: boolean | null
          coverage_score: number | null
          created_at: string
          created_by: string
          firm_city: string
          firm_name: string
          firm_practice_area: string
          firm_state: string
          firm_url: string
          id: string
          recommendation: Json | null
          report: Json
          updated_at: string
        }
        Insert: {
          brief_input_ready?: boolean | null
          coverage_score?: number | null
          created_at?: string
          created_by: string
          firm_city: string
          firm_name: string
          firm_practice_area: string
          firm_state: string
          firm_url: string
          id?: string
          recommendation?: Json | null
          report: Json
          updated_at?: string
        }
        Update: {
          brief_input_ready?: boolean | null
          coverage_score?: number | null
          created_at?: string
          created_by?: string
          firm_city?: string
          firm_name?: string
          firm_practice_area?: string
          firm_state?: string
          firm_url?: string
          id?: string
          recommendation?: Json | null
          report?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "sales_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_briefs: {
        Row: {
          assessment_id: string
          body_md: string
          cache_read_tokens: number | null
          cache_write_tokens: number | null
          created_at: string
          generated_by: string
          id: string
          input_tokens: number | null
          output_tokens: number | null
        }
        Insert: {
          assessment_id: string
          body_md: string
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          created_at?: string
          generated_by: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
        }
        Update: {
          assessment_id?: string
          body_md?: string
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          created_at?: string
          generated_by?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_briefs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "sales_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_briefs_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "sales_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_calls: {
        Row: {
          assessment_id: string
          closer_id: string | null
          contract_value_cents: number | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          next_action_at: string | null
          notes: string | null
          objections_hit: string[] | null
          opener_id: string
          outcome: Database["public"]["Enums"]["sales_call_outcome"] | null
          package_sold: string | null
          started_at: string
          transcript_excerpt: string | null
          triggers_hit: string[] | null
        }
        Insert: {
          assessment_id: string
          closer_id?: string | null
          contract_value_cents?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          next_action_at?: string | null
          notes?: string | null
          objections_hit?: string[] | null
          opener_id: string
          outcome?: Database["public"]["Enums"]["sales_call_outcome"] | null
          package_sold?: string | null
          started_at?: string
          transcript_excerpt?: string | null
          triggers_hit?: string[] | null
        }
        Update: {
          assessment_id?: string
          closer_id?: string | null
          contract_value_cents?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          next_action_at?: string | null
          notes?: string | null
          objections_hit?: string[] | null
          opener_id?: string
          outcome?: Database["public"]["Enums"]["sales_call_outcome"] | null
          package_sold?: string | null
          started_at?: string
          transcript_excerpt?: string | null
          triggers_hit?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_calls_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "sales_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_calls_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "sales_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_calls_opener_id_fkey"
            columns: ["opener_id"]
            isOneToOne: false
            referencedRelation: "sales_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_coach_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          rep_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          rep_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          rep_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_coach_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "sales_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_coach_notes_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_seen_at: string | null
          role: Database["public"]["Enums"]["sales_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          role?: Database["public"]["Enums"]["sales_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          role?: Database["public"]["Enums"]["sales_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sales_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["sales_role"]
      }
      sales_is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      sales_call_outcome:
        | "closed_won"
        | "closed_lost"
        | "follow_up_scheduled"
        | "no_decision"
        | "not_interested"
        | "callback_requested"
      sales_role: "opener" | "closer" | "admin"
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
      sales_call_outcome: [
        "closed_won",
        "closed_lost",
        "follow_up_scheduled",
        "no_decision",
        "not_interested",
        "callback_requested",
      ],
      sales_role: ["opener", "closer", "admin"],
    },
  },
} as const

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
      bases: {
        Row: {
          active: boolean
          created_at: string
          id: string
          lat: number
          lon: number
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          lat: number
          lon: number
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          lat?: number
          lon?: number
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      historical_data: {
        Row: {
          base_id: string
          bt_entry_rate: number
          bt_operator_removal: number
          bt_productivity: number
          created_at: string
          hour: number
          id: string
          mt_entry_rate: number
          mt_operator_removal: number
          mt_productivity: number
          updated_at: string
        }
        Insert: {
          base_id: string
          bt_entry_rate?: number
          bt_operator_removal?: number
          bt_productivity?: number
          created_at?: string
          hour: number
          id?: string
          mt_entry_rate?: number
          mt_operator_removal?: number
          mt_productivity?: number
          updated_at?: string
        }
        Update: {
          base_id?: string
          bt_entry_rate?: number
          bt_operator_removal?: number
          bt_productivity?: number
          created_at?: string
          hour?: number
          id?: string
          mt_entry_rate?: number
          mt_operator_removal?: number
          mt_productivity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_data_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_configs: {
        Row: {
          base_id: string
          bt_initial_backlog: number
          created_at: string
          horizon_hours: number
          id: string
          is_default: boolean
          mt_initial_backlog: number
          name: string
          teams_hour_0: number
          teams_hour_1: number
          teams_hour_10: number
          teams_hour_11: number
          teams_hour_12: number
          teams_hour_13: number
          teams_hour_14: number
          teams_hour_15: number
          teams_hour_16: number
          teams_hour_17: number
          teams_hour_18: number
          teams_hour_19: number
          teams_hour_2: number
          teams_hour_20: number
          teams_hour_21: number
          teams_hour_22: number
          teams_hour_23: number
          teams_hour_3: number
          teams_hour_4: number
          teams_hour_5: number
          teams_hour_6: number
          teams_hour_7: number
          teams_hour_8: number
          teams_hour_9: number
          updated_at: string
        }
        Insert: {
          base_id: string
          bt_initial_backlog?: number
          created_at?: string
          horizon_hours?: number
          id?: string
          is_default?: boolean
          mt_initial_backlog?: number
          name?: string
          teams_hour_0?: number
          teams_hour_1?: number
          teams_hour_10?: number
          teams_hour_11?: number
          teams_hour_12?: number
          teams_hour_13?: number
          teams_hour_14?: number
          teams_hour_15?: number
          teams_hour_16?: number
          teams_hour_17?: number
          teams_hour_18?: number
          teams_hour_19?: number
          teams_hour_2?: number
          teams_hour_20?: number
          teams_hour_21?: number
          teams_hour_22?: number
          teams_hour_23?: number
          teams_hour_3?: number
          teams_hour_4?: number
          teams_hour_5?: number
          teams_hour_6?: number
          teams_hour_7?: number
          teams_hour_8?: number
          teams_hour_9?: number
          updated_at?: string
        }
        Update: {
          base_id?: string
          bt_initial_backlog?: number
          created_at?: string
          horizon_hours?: number
          id?: string
          is_default?: boolean
          mt_initial_backlog?: number
          name?: string
          teams_hour_0?: number
          teams_hour_1?: number
          teams_hour_10?: number
          teams_hour_11?: number
          teams_hour_12?: number
          teams_hour_13?: number
          teams_hour_14?: number
          teams_hour_15?: number
          teams_hour_16?: number
          teams_hour_17?: number
          teams_hour_18?: number
          teams_hour_19?: number
          teams_hour_2?: number
          teams_hour_20?: number
          teams_hour_21?: number
          teams_hour_22?: number
          teams_hour_23?: number
          teams_hour_3?: number
          teams_hour_4?: number
          teams_hour_5?: number
          teams_hour_6?: number
          teams_hour_7?: number
          teams_hour_8?: number
          teams_hour_9?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_configs_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_history: {
        Row: {
          base_id: string
          bt_initial_backlog: number
          created_at: string
          horizon_hours: number
          id: string
          mt_initial_backlog: number
          name: string
          notes: string | null
          results_snapshot: Json
          team_structure_id: string | null
          team_structure_snapshot: Json | null
          weather_impact_enabled: boolean
          weather_provider: string
          weather_snapshot: Json | null
        }
        Insert: {
          base_id: string
          bt_initial_backlog?: number
          created_at?: string
          horizon_hours?: number
          id?: string
          mt_initial_backlog?: number
          name?: string
          notes?: string | null
          results_snapshot: Json
          team_structure_id?: string | null
          team_structure_snapshot?: Json | null
          weather_impact_enabled?: boolean
          weather_provider?: string
          weather_snapshot?: Json | null
        }
        Update: {
          base_id?: string
          bt_initial_backlog?: number
          created_at?: string
          horizon_hours?: number
          id?: string
          mt_initial_backlog?: number
          name?: string
          notes?: string | null
          results_snapshot?: Json
          team_structure_id?: string | null
          team_structure_snapshot?: Json | null
          weather_impact_enabled?: boolean
          weather_provider?: string
          weather_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_history_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_history_team_structure_id_fkey"
            columns: ["team_structure_id"]
            isOneToOne: false
            referencedRelation: "team_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      team_structures: {
        Row: {
          base_id: string
          created_at: string
          id: string
          is_default: boolean
          loss_teams_hour_0: number
          loss_teams_hour_1: number
          loss_teams_hour_10: number
          loss_teams_hour_11: number
          loss_teams_hour_12: number
          loss_teams_hour_13: number
          loss_teams_hour_14: number
          loss_teams_hour_15: number
          loss_teams_hour_16: number
          loss_teams_hour_17: number
          loss_teams_hour_18: number
          loss_teams_hour_19: number
          loss_teams_hour_2: number
          loss_teams_hour_20: number
          loss_teams_hour_21: number
          loss_teams_hour_22: number
          loss_teams_hour_23: number
          loss_teams_hour_3: number
          loss_teams_hour_4: number
          loss_teams_hour_5: number
          loss_teams_hour_6: number
          loss_teams_hour_7: number
          loss_teams_hour_8: number
          loss_teams_hour_9: number
          name: string
          teams_hour_0: number
          teams_hour_1: number
          teams_hour_10: number
          teams_hour_11: number
          teams_hour_12: number
          teams_hour_13: number
          teams_hour_14: number
          teams_hour_15: number
          teams_hour_16: number
          teams_hour_17: number
          teams_hour_18: number
          teams_hour_19: number
          teams_hour_2: number
          teams_hour_20: number
          teams_hour_21: number
          teams_hour_22: number
          teams_hour_23: number
          teams_hour_3: number
          teams_hour_4: number
          teams_hour_5: number
          teams_hour_6: number
          teams_hour_7: number
          teams_hour_8: number
          teams_hour_9: number
          updated_at: string
        }
        Insert: {
          base_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          loss_teams_hour_0?: number
          loss_teams_hour_1?: number
          loss_teams_hour_10?: number
          loss_teams_hour_11?: number
          loss_teams_hour_12?: number
          loss_teams_hour_13?: number
          loss_teams_hour_14?: number
          loss_teams_hour_15?: number
          loss_teams_hour_16?: number
          loss_teams_hour_17?: number
          loss_teams_hour_18?: number
          loss_teams_hour_19?: number
          loss_teams_hour_2?: number
          loss_teams_hour_20?: number
          loss_teams_hour_21?: number
          loss_teams_hour_22?: number
          loss_teams_hour_23?: number
          loss_teams_hour_3?: number
          loss_teams_hour_4?: number
          loss_teams_hour_5?: number
          loss_teams_hour_6?: number
          loss_teams_hour_7?: number
          loss_teams_hour_8?: number
          loss_teams_hour_9?: number
          name?: string
          teams_hour_0?: number
          teams_hour_1?: number
          teams_hour_10?: number
          teams_hour_11?: number
          teams_hour_12?: number
          teams_hour_13?: number
          teams_hour_14?: number
          teams_hour_15?: number
          teams_hour_16?: number
          teams_hour_17?: number
          teams_hour_18?: number
          teams_hour_19?: number
          teams_hour_2?: number
          teams_hour_20?: number
          teams_hour_21?: number
          teams_hour_22?: number
          teams_hour_23?: number
          teams_hour_3?: number
          teams_hour_4?: number
          teams_hour_5?: number
          teams_hour_6?: number
          teams_hour_7?: number
          teams_hour_8?: number
          teams_hour_9?: number
          updated_at?: string
        }
        Update: {
          base_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          loss_teams_hour_0?: number
          loss_teams_hour_1?: number
          loss_teams_hour_10?: number
          loss_teams_hour_11?: number
          loss_teams_hour_12?: number
          loss_teams_hour_13?: number
          loss_teams_hour_14?: number
          loss_teams_hour_15?: number
          loss_teams_hour_16?: number
          loss_teams_hour_17?: number
          loss_teams_hour_18?: number
          loss_teams_hour_19?: number
          loss_teams_hour_2?: number
          loss_teams_hour_20?: number
          loss_teams_hour_21?: number
          loss_teams_hour_22?: number
          loss_teams_hour_23?: number
          loss_teams_hour_3?: number
          loss_teams_hour_4?: number
          loss_teams_hour_5?: number
          loss_teams_hour_6?: number
          loss_teams_hour_7?: number
          loss_teams_hour_8?: number
          loss_teams_hour_9?: number
          name?: string
          teams_hour_0?: number
          teams_hour_1?: number
          teams_hour_10?: number
          teams_hour_11?: number
          teams_hour_12?: number
          teams_hour_13?: number
          teams_hour_14?: number
          teams_hour_15?: number
          teams_hour_16?: number
          teams_hour_17?: number
          teams_hour_18?: number
          teams_hour_19?: number
          teams_hour_2?: number
          teams_hour_20?: number
          teams_hour_21?: number
          teams_hour_22?: number
          teams_hour_23?: number
          teams_hour_3?: number
          teams_hour_4?: number
          teams_hour_5?: number
          teams_hour_6?: number
          teams_hour_7?: number
          teams_hour_8?: number
          teams_hour_9?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_structures_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_triggers: {
        Row: {
          active: boolean
          base_id: string | null
          condition_max: number | null
          condition_min: number | null
          created_at: string
          description: string | null
          id: string
          impact_percent: number
          name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_id?: string | null
          condition_max?: number | null
          condition_min?: number | null
          created_at?: string
          description?: string | null
          id?: string
          impact_percent: number
          name: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_id?: string | null
          condition_max?: number | null
          condition_min?: number | null
          created_at?: string
          description?: string | null
          id?: string
          impact_percent?: number
          name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_triggers_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

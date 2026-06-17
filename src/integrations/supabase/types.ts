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
      activities: {
        Row: {
          activity_date: string
          created_at: string
          crop_id: string | null
          end_date: string | null
          id: string
          notes: string | null
          project_id: string | null
          start_date: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          created_at?: string
          crop_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          crop_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_health_records: {
        Row: {
          animal_id: string
          cost: number | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          record_date: string
          record_type: string
          user_id: string
        }
        Insert: {
          animal_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          record_date?: string
          record_type: string
          user_id: string
        }
        Update: {
          animal_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          record_date?: string
          record_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_status_history: {
        Row: {
          animal_id: string
          changed_at: string
          created_at: string
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          animal_id: string
          changed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          status: string
          user_id: string
        }
        Update: {
          animal_id?: string
          changed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_status_history_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          animal_type: string
          breed: string | null
          created_at: string
          date_of_birth: string | null
          estimated_value: number
          gender: string | null
          group_id: string
          id: string
          mother_id: string | null
          name: string | null
          notes: string | null
          project_id: string
          status: string
          tag_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          animal_type: string
          breed?: string | null
          created_at?: string
          date_of_birth?: string | null
          estimated_value?: number
          gender?: string | null
          group_id: string
          id?: string
          mother_id?: string | null
          name?: string | null
          notes?: string | null
          project_id: string
          status?: string
          tag_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          animal_type?: string
          breed?: string | null
          created_at?: string
          date_of_birth?: string | null
          estimated_value?: number
          gender?: string | null
          group_id?: string
          id?: string
          mother_id?: string | null
          name?: string | null
          notes?: string | null
          project_id?: string
          status?: string
          tag_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "livestock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      birth_records: {
        Row: {
          birth_date: string
          created_at: string
          group_id: string
          id: string
          mother_id: string | null
          notes: string | null
          num_females: number
          num_males: number
          num_offspring: number
          project_id: string
          user_id: string
        }
        Insert: {
          birth_date?: string
          created_at?: string
          group_id: string
          id?: string
          mother_id?: string | null
          notes?: string | null
          num_females?: number
          num_males?: number
          num_offspring?: number
          project_id: string
          user_id: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          group_id?: string
          id?: string
          mother_id?: string | null
          notes?: string | null
          num_females?: number
          num_males?: number
          num_offspring?: number
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birth_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "livestock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birth_records_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_records: {
        Row: {
          animal_id: string
          bred_on: string
          created_at: string
          expected_due: string | null
          id: string
          mate_tag: string | null
          notes: string | null
          outcome: string | null
          user_id: string
        }
        Insert: {
          animal_id: string
          bred_on?: string
          created_at?: string
          expected_due?: string | null
          id?: string
          mate_tag?: string | null
          notes?: string | null
          outcome?: string | null
          user_id: string
        }
        Update: {
          animal_id?: string
          bred_on?: string
          created_at?: string
          expected_due?: string | null
          id?: string
          mate_tag?: string | null
          notes?: string | null
          outcome?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_activities: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          project_id: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crops: {
        Row: {
          created_at: string
          expected_harvest_date: string | null
          id: string
          name: string
          planting_date: string | null
          project_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_harvest_date?: string | null
          id?: string
          name: string
          planting_date?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expected_harvest_date?: string | null
          id?: string
          name?: string
          planting_date?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crops_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          activity_id: string | null
          amount: number
          category: string | null
          construction_activity_id: string | null
          created_at: string
          expense_date: string
          expense_type: string | null
          id: string
          project_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          amount: number
          category?: string | null
          construction_activity_id?: string | null
          created_at?: string
          expense_date?: string
          expense_type?: string | null
          id?: string
          project_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          amount?: number
          category?: string | null
          construction_activity_id?: string | null
          created_at?: string
          expense_date?: string
          expense_type?: string | null
          id?: string
          project_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          size?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          created_at: string
          id: string
          income_date: string
          project_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          income_date?: string
          project_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          income_date?: string
          project_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock: {
        Row: {
          animal_type: string
          breed: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          project_id: string
          purchase_cost: number | null
          purchase_date: string | null
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          animal_type: string
          breed?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          project_id: string
          purchase_cost?: number | null
          purchase_date?: string | null
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          animal_type?: string
          breed?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestock_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_activities: {
        Row: {
          activity_date: string
          created_at: string
          id: string
          livestock_id: string | null
          notes: string | null
          project_id: string
          type: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          created_at?: string
          id?: string
          livestock_id?: string | null
          notes?: string | null
          project_id: string
          type: string
          user_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          id?: string
          livestock_id?: string | null
          notes?: string | null
          project_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestock_activities_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestock_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_valuation_snapshots: {
        Row: {
          animal_count: number
          created_at: string
          group_id: string | null
          id: string
          project_id: string
          snapshot_date: string
          total_value: number
          user_id: string
        }
        Insert: {
          animal_count?: number
          created_at?: string
          group_id?: string | null
          id?: string
          project_id: string
          snapshot_date?: string
          total_value?: number
          user_id: string
        }
        Update: {
          animal_count?: number
          created_at?: string
          group_id?: string | null
          id?: string
          project_id?: string
          snapshot_date?: string
          total_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestock_valuation_snapshots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "livestock"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_records: {
        Row: {
          animal_id: string | null
          created_at: string
          group_id: string
          id: string
          liters: number
          notes: string | null
          project_id: string
          record_date: string
          user_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          group_id: string
          id?: string
          liters?: number
          notes?: string | null
          project_id: string
          record_date?: string
          user_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          group_id?: string
          id?: string
          liters?: number
          notes?: string | null
          project_id?: string
          record_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milk_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "livestock"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_birth: {
        Args: {
          _birth_date: string
          _group_id: string
          _mother_id: string
          _notes: string
          _num_females: number
          _num_males: number
          _project_id: string
        }
        Returns: string
      }
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

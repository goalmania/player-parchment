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
      access_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          owner_id: string
          player_id: string
          requester_id: string
          status: Database["public"]["Enums"]["access_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          owner_id: string
          player_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["access_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          owner_id?: string
          player_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["access_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number | null
          birth_year: number | null
          club: string | null
          created_at: string
          date: string | null
          flag: string | null
          foot: string | null
          formations_played: Json | null
          heatmap: Json | null
          height: number | null
          id: string
          lat: number | null
          league: string | null
          lng: number | null
          market: Json | null
          name: string
          nationality: string | null
          num: string | null
          observation_count: number | null
          observation_type: string | null
          observations: Json | null
          owner_id: string
          photo: string | null
          position_code: string | null
          position_main: string | null
          position_secondary: Json | null
          ratings: Json | null
          raw_report: string | null
          region: string | null
          skills: Json | null
          stars: Json | null
          stats: Json
          stats_season: string | null
          stats_source: string | null
          strengths: Json | null
          summary: string | null
          tactical_roles: Json | null
          tags: Json | null
          updated_at: string
          verdict: string | null
          verdict_type: string | null
          video_urls: Json | null
          weaknesses: Json | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          birth_year?: number | null
          club?: string | null
          created_at?: string
          date?: string | null
          flag?: string | null
          foot?: string | null
          formations_played?: Json | null
          heatmap?: Json | null
          height?: number | null
          id?: string
          lat?: number | null
          league?: string | null
          lng?: number | null
          market?: Json | null
          name: string
          nationality?: string | null
          num?: string | null
          observation_count?: number | null
          observation_type?: string | null
          observations?: Json | null
          owner_id: string
          photo?: string | null
          position_code?: string | null
          position_main?: string | null
          position_secondary?: Json | null
          ratings?: Json | null
          raw_report?: string | null
          region?: string | null
          skills?: Json | null
          stars?: Json | null
          stats?: Json
          stats_season?: string | null
          stats_source?: string | null
          strengths?: Json | null
          summary?: string | null
          tactical_roles?: Json | null
          tags?: Json | null
          updated_at?: string
          verdict?: string | null
          verdict_type?: string | null
          video_urls?: Json | null
          weaknesses?: Json | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          birth_year?: number | null
          club?: string | null
          created_at?: string
          date?: string | null
          flag?: string | null
          foot?: string | null
          formations_played?: Json | null
          heatmap?: Json | null
          height?: number | null
          id?: string
          lat?: number | null
          league?: string | null
          lng?: number | null
          market?: Json | null
          name?: string
          nationality?: string | null
          num?: string | null
          observation_count?: number | null
          observation_type?: string | null
          observations?: Json | null
          owner_id?: string
          photo?: string | null
          position_code?: string | null
          position_main?: string | null
          position_secondary?: Json | null
          ratings?: Json | null
          raw_report?: string | null
          region?: string | null
          skills?: Json | null
          stars?: Json | null
          stats?: Json
          stats_season?: string | null
          stats_source?: string | null
          strengths?: Json | null
          summary?: string | null
          tactical_roles?: Json | null
          tags?: Json | null
          updated_at?: string
          verdict?: string | null
          verdict_type?: string | null
          video_urls?: Json | null
          weaknesses?: Json | null
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          org_name: string
          org_type: Database["public"]["Enums"]["org_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          org_name: string
          org_type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          org_name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_comparisons: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          player_ids: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          player_ids?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          player_ids?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_player_access: {
        Args: { _player_id: string; _user_id: string }
        Returns: boolean
      }
      list_public_players: {
        Args: never
        Returns: {
          age: number
          birth_year: number
          club: string
          created_at: string
          flag: string
          id: string
          league: string
          name: string
          nationality: string
          owner_id: string
          photo: string
          position_code: string
          position_main: string
          region: string
        }[]
      }
    }
    Enums: {
      access_request_status: "pending" | "accepted" | "rejected"
      org_type: "agency" | "club"
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
      access_request_status: ["pending", "accepted", "rejected"],
      org_type: ["agency", "club"],
    },
  },
} as const

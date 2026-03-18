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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string
          id: string
          lead_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          lead_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          lead_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          date: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          lead_id: string | null
          notes: string | null
          schedule_id: string
          status: string
          time: string
        }
        Insert: {
          created_at?: string
          date: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          schedule_id: string
          status?: string
          time: string
        }
        Update: {
          created_at?: string
          date?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          schedule_id?: string
          status?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          date: string
          description: string | null
          duration: number | null
          guest_email: string | null
          guest_name: string | null
          id: string
          lead_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          duration?: number | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          duration?: number | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      checkouts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_published: boolean
          items: Json
          slug: string
          style: Json
          title: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          items?: Json
          slug: string
          style?: Json
          title: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          items?: Json
          slug?: string
          style?: Json
          title?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      form_responses: {
        Row: {
          completed_at: string
          form_id: string
          id: string
          lead_id: string | null
          responses: Json
        }
        Insert: {
          completed_at?: string
          form_id: string
          id?: string
          lead_id?: string | null
          responses?: Json
        }
        Update: {
          completed_at?: string
          form_id?: string
          id?: string
          lead_id?: string | null
          responses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          is_published: boolean
          pipeline_id: string | null
          settings: Json
          slug: string
          stage_id: string | null
          style: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          is_published?: boolean
          pipeline_id?: string | null
          settings?: Json
          slug: string
          stage_id?: string | null
          style?: Json
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          is_published?: boolean
          pipeline_id?: string | null
          settings?: Json
          slug?: string
          stage_id?: string | null
          style?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      landing_page_sections: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_visible: boolean
          order: number
          page_id: string
          section_type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          order?: number
          page_id: string
          section_type: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          order?: number
          page_id?: string
          section_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          created_at: string
          custom_css: string | null
          custom_domain: string | null
          html_content: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          pixel_google_id: string | null
          pixel_meta_id: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          html_content?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          pixel_google_id?: string | null
          pixel_meta_id?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          html_content?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          pixel_google_id?: string | null
          pixel_meta_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: number
          source: string | null
          stage_id: string | null
          status: string
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: number
          source?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: number
          source?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          checkout_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          lead_id: string | null
          notes: string | null
          status: string
          total: number
        }
        Insert: {
          checkout_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          status?: string
          total?: number
        }
        Update: {
          checkout_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_responses: {
        Row: {
          completed_at: string
          id: string
          lead_id: string | null
          quiz_id: string
          responses: Json
        }
        Insert: {
          completed_at?: string
          id?: string
          lead_id?: string | null
          quiz_id: string
          responses?: Json
        }
        Update: {
          completed_at?: string
          id?: string
          lead_id?: string | null
          quiz_id?: string
          responses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          questions: Json
          slug: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          questions?: Json
          slug: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          questions?: Json
          slug?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          available_days: Json
          available_hours: Json
          created_at: string
          description: string | null
          duration: number
          id: string
          is_active: boolean
          is_published: boolean
          pipeline_id: string | null
          slug: string
          stage_id: string | null
          style: Json
          title: string
          user_id: string
        }
        Insert: {
          available_days?: Json
          available_hours?: Json
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          pipeline_id?: string | null
          slug: string
          stage_id?: string | null
          style?: Json
          title: string
          user_id?: string
        }
        Update: {
          available_days?: Json
          available_hours?: Json
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          pipeline_id?: string | null
          slug?: string
          stage_id?: string | null
          style?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
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

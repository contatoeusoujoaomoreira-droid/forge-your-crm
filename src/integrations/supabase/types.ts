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
      agent_knowledge: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          error: string | null
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          source_url: string | null
          status: string
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string
          error?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          source_url?: string | null
          status?: string
          title?: string | null
          type?: string
          user_id?: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          error?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          source_url?: string | null
          status?: string
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          ai_provider_config_id: string | null
          auto_close_enabled: boolean
          auto_close_message: string | null
          business_hours: Json
          created_at: string
          display_name: string | null
          examples: string | null
          handoff_enabled: boolean
          handoff_keywords: string | null
          id: string
          inactivity_timeout_minutes: number | null
          is_active: boolean
          max_message_chars: number
          max_tokens: number | null
          message_limit: number | null
          model: string | null
          multimedia_provider_config_id: string | null
          name: string
          objections: string | null
          personality: string | null
          pipeline_id: string | null
          reply_to_audio_with_audio: boolean
          response_delay_seconds: number | null
          routing_rules: Json
          rules: string | null
          simulate_recording: boolean
          simulate_typing: boolean
          split_long_messages: boolean
          stage_id: string | null
          stop_words: string | null
          style: string | null
          system_prompt: string
          tone: string | null
          total_tokens_used: number | null
          transcribe_audio: boolean
          type: string
          understand_images: boolean
          updated_at: string
          user_id: string
          voice_enabled: boolean
          voice_id: string | null
          voice_provider: string
        }
        Insert: {
          ai_provider_config_id?: string | null
          auto_close_enabled?: boolean
          auto_close_message?: string | null
          business_hours?: Json
          created_at?: string
          display_name?: string | null
          examples?: string | null
          handoff_enabled?: boolean
          handoff_keywords?: string | null
          id?: string
          inactivity_timeout_minutes?: number | null
          is_active?: boolean
          max_message_chars?: number
          max_tokens?: number | null
          message_limit?: number | null
          model?: string | null
          multimedia_provider_config_id?: string | null
          name: string
          objections?: string | null
          personality?: string | null
          pipeline_id?: string | null
          reply_to_audio_with_audio?: boolean
          response_delay_seconds?: number | null
          routing_rules?: Json
          rules?: string | null
          simulate_recording?: boolean
          simulate_typing?: boolean
          split_long_messages?: boolean
          stage_id?: string | null
          stop_words?: string | null
          style?: string | null
          system_prompt?: string
          tone?: string | null
          total_tokens_used?: number | null
          transcribe_audio?: boolean
          type?: string
          understand_images?: boolean
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean
          voice_id?: string | null
          voice_provider?: string
        }
        Update: {
          ai_provider_config_id?: string | null
          auto_close_enabled?: boolean
          auto_close_message?: string | null
          business_hours?: Json
          created_at?: string
          display_name?: string | null
          examples?: string | null
          handoff_enabled?: boolean
          handoff_keywords?: string | null
          id?: string
          inactivity_timeout_minutes?: number | null
          is_active?: boolean
          max_message_chars?: number
          max_tokens?: number | null
          message_limit?: number | null
          model?: string | null
          multimedia_provider_config_id?: string | null
          name?: string
          objections?: string | null
          personality?: string | null
          pipeline_id?: string | null
          reply_to_audio_with_audio?: boolean
          response_delay_seconds?: number | null
          routing_rules?: Json
          rules?: string | null
          simulate_recording?: boolean
          simulate_typing?: boolean
          split_long_messages?: boolean
          stage_id?: string | null
          stop_words?: string | null
          style?: string | null
          system_prompt?: string
          tone?: string | null
          total_tokens_used?: number | null
          transcribe_audio?: boolean
          type?: string
          understand_images?: boolean
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean
          voice_id?: string | null
          voice_provider?: string
        }
        Relationships: []
      }
      ai_provider_configs: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          default_model: string | null
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          provider: string
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          default_model?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          provider?: string
          user_id?: string
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          default_model?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_preview: string | null
          label: string
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_preview?: string | null
          label: string
          last_used_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_preview?: string | null
          label?: string
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          cancellation_token: string | null
          cancelled_at: string | null
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
          cancellation_token?: string | null
          cancelled_at?: string | null
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
          cancellation_token?: string | null
          cancelled_at?: string | null
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
      campaign_contacts: {
        Row: {
          campaign_id: string
          client_id: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          failure_reason: string | null
          follow_ups_sent: number | null
          id: string
          last_message_at: string | null
          lead_id: string | null
          metadata: Json | null
          name: string | null
          phone: string
          replied_at: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          client_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          follow_ups_sent?: number | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          name?: string | null
          phone: string
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          client_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          follow_ups_sent?: number | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_automations: {
        Row: {
          actions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority: number | null
          total_triggered: number | null
          trigger_type: string
          trigger_value: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number | null
          total_triggered?: number | null
          trigger_type: string
          trigger_value?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number | null
          total_triggered?: number | null
          trigger_type?: string
          trigger_value?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_clients: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          name: string | null
          phone: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      conversation_flow_sessions: {
        Row: {
          client_id: string
          current_node_id: string | null
          flow_id: string
          id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
          variables: Json
        }
        Insert: {
          client_id: string
          current_node_id?: string | null
          flow_id: string
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          variables?: Json
        }
        Update: {
          client_id?: string
          current_node_id?: string | null
          flow_id?: string
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          variables?: Json
        }
        Relationships: []
      }
      conversation_flows: {
        Row: {
          agent_id: string | null
          created_at: string
          description: string | null
          edges: Json
          id: string
          is_active: boolean
          name: string
          nodes: Json
          trigger_keywords: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name: string
          nodes?: Json
          trigger_keywords?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name?: string
          nodes?: Json
          trigger_keywords?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_state: {
        Row: {
          ai_active: boolean
          assigned_agent_id: string | null
          assigned_user_id: string | null
          client_id: string
          id: string
          last_human_reply_at: string | null
          marked_unread: boolean
          mode: string
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_active?: boolean
          assigned_agent_id?: string | null
          assigned_user_id?: string | null
          client_id: string
          id?: string
          last_human_reply_at?: string | null
          marked_unread?: boolean
          mode?: string
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_active?: boolean
          assigned_agent_id?: string | null
          assigned_user_id?: string | null
          client_id?: string
          id?: string
          last_human_reply_at?: string | null
          marked_unread?: boolean
          mode?: string
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          checkout_id: string | null
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
          user_id: string
        }
        Insert: {
          checkout_id?: string | null
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          user_id?: string
        }
        Update: {
          checkout_id?: string | null
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_costs: {
        Row: {
          action: string
          created_at: string
          credits_per_unit: number
          id: string
          label: string
          markup_multiplier: number
          notes: string | null
          provider_cost_estimate: number
          unit: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          credits_per_unit?: number
          id?: string
          label: string
          markup_multiplier?: number
          notes?: string | null
          provider_cost_estimate?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          credits_per_unit?: number
          id?: string
          label?: string
          markup_multiplier?: number
          notes?: string | null
          provider_cost_estimate?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          metadata: Json
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      custom_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_active: boolean
          project_id: string | null
          project_type: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          project_id?: string | null
          project_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          project_id?: string | null
          project_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
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
          notification_email: string | null
          pipeline_id: string | null
          settings: Json
          slug: string
          stage_id: string | null
          style: Json
          title: string
          updated_at: string
          user_id: string
          webhook_url: string | null
          whatsapp_message: string | null
          whatsapp_redirect: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          is_published?: boolean
          notification_email?: string | null
          pipeline_id?: string | null
          settings?: Json
          slug: string
          stage_id?: string | null
          style?: Json
          title: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
          whatsapp_message?: string | null
          whatsapp_redirect?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          is_published?: boolean
          notification_email?: string | null
          pipeline_id?: string | null
          settings?: Json
          slug?: string
          stage_id?: string | null
          style?: Json
          title?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
          whatsapp_message?: string | null
          whatsapp_redirect?: string | null
        }
        Relationships: []
      }
      imported_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          lead_id: string | null
          list_id: string
          metadata: Json
          name: string | null
          phone: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          list_id: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          list_id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      imported_lists: {
        Row: {
          created_at: string
          id: string
          list_type: string
          name: string
          tag: string | null
          total_contacts: number
          total_converted: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_type?: string
          name: string
          tag?: string | null
          total_contacts?: number
          total_converted?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          list_type?: string
          name?: string
          tag?: string | null
          total_contacts?: number
          total_converted?: number
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
          contract_months: number | null
          created_at: string
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          monthly_value: number | null
          name: string
          notes: string | null
          phone: string | null
          pipeline_id: string | null
          position: number
          priority: string | null
          probability: number | null
          revenue_type: string | null
          source: string | null
          stage_id: string | null
          status: string
          tags: string[] | null
          updated_at: string
          urgency: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          value: number | null
          website: string | null
        }
        Insert: {
          company?: string | null
          contract_months?: number | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          monthly_value?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          position?: number
          priority?: string | null
          probability?: number | null
          revenue_type?: string | null
          source?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          urgency?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
          website?: string | null
        }
        Update: {
          company?: string | null
          contract_months?: number | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          monthly_value?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          position?: number
          priority?: string | null
          probability?: number | null
          revenue_type?: string | null
          source?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          urgency?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
          website?: string | null
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
      managed_users: {
        Row: {
          ai_credits: number
          created_at: string
          created_by: string | null
          credits_balance: number
          credits_monthly: number
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          permissions: Json
          plan: string
          tier: string
          user_id: string | null
        }
        Insert: {
          ai_credits?: number
          created_at?: string
          created_by?: string | null
          credits_balance?: number
          credits_monthly?: number
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json
          plan?: string
          tier?: string
          user_id?: string | null
        }
        Update: {
          ai_credits?: number
          created_at?: string
          created_by?: string | null
          credits_balance?: number
          credits_monthly?: number
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json
          plan?: string
          tier?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          agent_id: string | null
          campaign_id: string | null
          channel: string
          client_id: string | null
          content: string | null
          created_at: string
          direction: string
          external_message_id: string | null
          id: string
          is_internal_note: boolean
          is_read: boolean
          lead_id: string | null
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          sender_name: string | null
          sender_phone: string | null
          status: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          campaign_id?: string | null
          channel?: string
          client_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          is_internal_note?: boolean
          is_read?: boolean
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          campaign_id?: string | null
          channel?: string
          client_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          is_internal_note?: boolean
          is_read?: boolean
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      model_credit_costs: {
        Row: {
          created_at: string
          credits_per_message: number
          id: string
          is_active: boolean
          label: string
          model: string
          notes: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_per_message?: number
          id?: string
          is_active?: boolean
          label: string
          model: string
          notes?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_per_message?: number
          id?: string
          is_active?: boolean
          label?: string
          model?: string
          notes?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          metadata: Json | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          checkout_id: string
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number
          id: string
          items: Json
          lead_id: string | null
          notes: string | null
          status: string
          total: number
        }
        Insert: {
          checkout_id: string
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          status?: string
          total?: number
        }
        Update: {
          checkout_id?: string
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number
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
          pipeline_id: string | null
          position: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pipeline_id?: string | null
          position?: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits_balance: number
          credits_monthly: number
          credits_used: number
          full_name: string | null
          id: string
          plan: string
          plan_renewed_at: string
          team_seats: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits_balance?: number
          credits_monthly?: number
          credits_used?: number
          full_name?: string | null
          id?: string
          plan?: string
          plan_renewed_at?: string
          team_seats?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits_balance?: number
          credits_monthly?: number
          credits_used?: number
          full_name?: string | null
          id?: string
          plan?: string
          plan_renewed_at?: string
          team_seats?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prospecting_campaigns: {
        Row: {
          agent_id: string | null
          business_hours: Json | null
          channel: string
          created_at: string
          daily_limit: number | null
          delay_max_seconds: number | null
          delay_min_seconds: number | null
          description: string | null
          flow_id: string | null
          follow_up_delay_hours: number | null
          follow_up_enabled: boolean | null
          id: string
          max_follow_ups: number | null
          message_template: string | null
          name: string
          pipeline_id: string | null
          source_pipelines: Json
          stage_id: string | null
          status: string
          target_pipeline_id: string | null
          target_stage_id: string | null
          total_converted: number | null
          total_replied: number | null
          total_sent: number | null
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          business_hours?: Json | null
          channel?: string
          created_at?: string
          daily_limit?: number | null
          delay_max_seconds?: number | null
          delay_min_seconds?: number | null
          description?: string | null
          flow_id?: string | null
          follow_up_delay_hours?: number | null
          follow_up_enabled?: boolean | null
          id?: string
          max_follow_ups?: number | null
          message_template?: string | null
          name: string
          pipeline_id?: string | null
          source_pipelines?: Json
          stage_id?: string | null
          status?: string
          target_pipeline_id?: string | null
          target_stage_id?: string | null
          total_converted?: number | null
          total_replied?: number | null
          total_sent?: number | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          agent_id?: string | null
          business_hours?: Json | null
          channel?: string
          created_at?: string
          daily_limit?: number | null
          delay_max_seconds?: number | null
          delay_min_seconds?: number | null
          description?: string | null
          flow_id?: string | null
          follow_up_delay_hours?: number | null
          follow_up_enabled?: boolean | null
          id?: string
          max_follow_ups?: number | null
          message_template?: string | null
          name?: string
          pipeline_id?: string | null
          source_pipelines?: Json
          stage_id?: string | null
          status?: string
          target_pipeline_id?: string | null
          target_stage_id?: string | null
          total_converted?: number | null
          total_replied?: number | null
          total_sent?: number | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          shortcut: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          shortcut: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          shortcut?: string
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
          is_published: boolean | null
          pipeline_id: string | null
          questions: Json
          settings: Json | null
          slug: string
          stage_id: string | null
          style: Json | null
          title: string
          user_id: string
          whatsapp_message: string | null
          whatsapp_redirect: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean | null
          pipeline_id?: string | null
          questions?: Json
          settings?: Json | null
          slug: string
          stage_id?: string | null
          style?: Json | null
          title: string
          user_id?: string
          whatsapp_message?: string | null
          whatsapp_redirect?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean | null
          pipeline_id?: string | null
          questions?: Json
          settings?: Json | null
          slug?: string
          stage_id?: string | null
          style?: Json | null
          title?: string
          user_id?: string
          whatsapp_message?: string | null
          whatsapp_redirect?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          allow_cancellation: boolean
          available_days: Json
          available_hours: Json
          blocked_dates: Json
          buffer_minutes: number
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
          timezone: string
          title: string
          user_id: string
        }
        Insert: {
          allow_cancellation?: boolean
          available_days?: Json
          available_hours?: Json
          blocked_dates?: Json
          buffer_minutes?: number
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
          timezone?: string
          title: string
          user_id?: string
        }
        Update: {
          allow_cancellation?: boolean
          available_days?: Json
          available_hours?: Json
          blocked_dates?: Json
          buffer_minutes?: number
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
          timezone?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          member_email: string
          member_user_id: string | null
          owner_user_id: string
          permissions: Json
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          member_email: string
          member_user_id?: string | null
          owner_user_id: string
          permissions?: Json
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          member_email?: string
          member_user_id?: string | null
          owner_user_id?: string
          permissions?: Json
          role?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string | null
          metadata: Json
          provider: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string | null
          metadata?: Json
          provider: string
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string | null
          metadata?: Json
          provider?: string
          scope?: string
          updated_at?: string
          user_id?: string
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
      webhook_logs: {
        Row: {
          created_at: string
          direction: string
          error: string | null
          event: string | null
          id: string
          payload: Json | null
          source: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          direction?: string
          error?: string | null
          event?: string | null
          id?: string
          payload?: Json | null
          source?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          error?: string | null
          event?: string | null
          id?: string
          payload?: Json | null
          source?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_configs: {
        Row: {
          ai_auto_reply: boolean
          api_token: string | null
          api_type: string
          auto_create_lead: boolean
          base_url: string | null
          created_at: string
          default_agent_id: string | null
          default_pipeline_id: string | null
          default_stage_id: string | null
          extra_headers: Json | null
          id: string
          instance_id: string | null
          is_active: boolean
          label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_auto_reply?: boolean
          api_token?: string | null
          api_type?: string
          auto_create_lead?: boolean
          base_url?: string | null
          created_at?: string
          default_agent_id?: string | null
          default_pipeline_id?: string | null
          default_stage_id?: string | null
          extra_headers?: Json | null
          id?: string
          instance_id?: string | null
          is_active?: boolean
          label?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          ai_auto_reply?: boolean
          api_token?: string | null
          api_type?: string
          auto_create_lead?: boolean
          base_url?: string | null
          created_at?: string
          default_agent_id?: string | null
          default_pipeline_id?: string | null
          default_stage_id?: string | null
          extra_headers?: Json | null
          id?: string
          instance_id?: string | null
          is_active?: boolean
          label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_credit_request: { Args: { _request_id: string }; Returns: Json }
      deduct_credits: {
        Args: {
          _amount: number
          _kind: string
          _metadata?: Json
          _user_id: string
        }
        Returns: boolean
      }
      deduct_credits_by_action: {
        Args: {
          _action: string
          _metadata?: Json
          _quantity?: number
          _user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sync_super_admin_entitlements: { Args: never; Returns: undefined }
      user_usage_stats: { Args: { _user_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user" | "professional" | "basic"
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
      app_role: ["super_admin", "admin", "user", "professional", "basic"],
    },
  },
} as const

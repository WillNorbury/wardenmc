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
      account_removal_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          occurred_at: string
          reason: string | null
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          reason?: string | null
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          reason?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      admin_broadcast_logs: {
        Row: {
          category: string
          created_at: string
          failed_count: number
          from_address: string | null
          id: string
          message_preview: string | null
          queued_count: number
          sender_email: string | null
          sender_id: string | null
          subject: string
          test_email: string | null
          total_recipients: number
        }
        Insert: {
          category: string
          created_at?: string
          failed_count?: number
          from_address?: string | null
          id?: string
          message_preview?: string | null
          queued_count?: number
          sender_email?: string | null
          sender_id?: string | null
          subject: string
          test_email?: string | null
          total_recipients?: number
        }
        Update: {
          category?: string
          created_at?: string
          failed_count?: number
          from_address?: string | null
          id?: string
          message_preview?: string | null
          queued_count?: number
          sender_email?: string | null
          sender_id?: string | null
          subject?: string
          test_email?: string | null
          total_recipients?: number
        }
        Relationships: []
      }
      admin_check_logs: {
        Row: {
          context: string | null
          created_at: string
          email: string | null
          id: string
          is_admin: boolean
          roles_found: string[] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin: boolean
          roles_found?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          roles_found?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_skripts: {
        Row: {
          created_at: string
          description: string | null
          filename: string
          id: string
          name: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          filename: string
          id?: string
          name: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          filename?: string
          id?: string
          name?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          down_payload_template: Json | null
          email_recipients: string[]
          id: number
          up_payload_template: Json | null
          updated_at: string
          webhook_urls: string[]
        }
        Insert: {
          down_payload_template?: Json | null
          email_recipients?: string[]
          id?: number
          up_payload_template?: Json | null
          updated_at?: string
          webhook_urls?: string[]
        }
        Update: {
          down_payload_template?: Json | null
          email_recipients?: string[]
          id?: number
          up_payload_template?: Json | null
          updated_at?: string
          webhook_urls?: string[]
        }
        Relationships: []
      }
      allowed_from_addresses: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      application_types: {
        Row: {
          accepting: boolean
          color: string
          created_at: string
          description: string
          enabled: boolean
          icon: string
          id: string
          intro: string | null
          label: string
          portfolio_label: string | null
          requires_portfolio: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accepting?: boolean
          color?: string
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string
          id?: string
          intro?: string | null
          label: string
          portfolio_label?: string | null
          requires_portfolio?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accepting?: boolean
          color?: string
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string
          id?: string
          intro?: string | null
          label?: string
          portfolio_label?: string | null
          requires_portfolio?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          age: number | null
          created_at: string
          discord: string | null
          experience: string | null
          extra: Json
          id: string
          mc_username: string
          portfolio_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["application_status"]
          timezone: string | null
          type: string
          updated_at: string
          user_id: string
          why: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          discord?: string | null
          experience?: string | null
          extra?: Json
          id?: string
          mc_username: string
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          timezone?: string | null
          type: string
          updated_at?: string
          user_id: string
          why: string
        }
        Update: {
          age?: number | null
          created_at?: string
          discord?: string | null
          experience?: string | null
          extra?: Json
          id?: string
          mc_username?: string
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          timezone?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          why?: string
        }
        Relationships: []
      }
      ban_appeals: {
        Row: {
          admin_response: string | null
          appeal_text: string
          ban_reason: string | null
          created_at: string
          discord_tag: string | null
          email: string | null
          id: string
          minecraft_username: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          appeal_text: string
          ban_reason?: string | null
          created_at?: string
          discord_tag?: string | null
          email?: string | null
          id?: string
          minecraft_username: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          appeal_text?: string
          ban_reason?: string | null
          created_at?: string
          discord_tag?: string | null
          email?: string | null
          id?: string
          minecraft_username?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          category: string
          content: string
          created_at: string
          discord_posted_at: string | null
          entry_date: string
          id: string
          image_url: string | null
          published: boolean
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          discord_posted_at?: string | null
          entry_date?: string
          id?: string
          image_url?: string | null
          published?: boolean
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          discord_posted_at?: string | null
          entry_date?: string
          id?: string
          image_url?: string | null
          published?: boolean
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled: boolean
          handled_at: string | null
          handled_by: string | null
          id: string
          message: string
          name: string
          replied_at: string | null
          replied_by: string | null
          reply_text: string | null
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          handled?: boolean
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          reply_text?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          handled?: boolean
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          reply_text?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_methods: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          label: string
          published: boolean
          sort_order: number
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          published?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          published?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      creator_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          creator_name: string
          discount_percent: number
          id: string
          max_uses: number | null
          notes: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          creator_name: string
          discount_percent?: number
          id?: string
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          creator_name?: string
          discount_percent?: number
          id?: string
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          color: string
          created_at: string
          emoji: string
          key: string
          label: string
          rank: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          emoji?: string
          key: string
          label: string
          rank?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          emoji?: string
          key?: string
          label?: string
          rank?: number
          updated_at?: string
        }
        Relationships: []
      }
      discord_bot_action_logs: {
        Row: {
          action: string
          channel_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          http_status: number | null
          id: string
          message_id: string | null
          request: Json
          response: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          channel_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          http_status?: number | null
          id?: string
          message_id?: string | null
          request?: Json
          response?: Json | null
          status: string
          user_id?: string | null
        }
        Update: {
          action?: string
          channel_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          http_status?: number | null
          id?: string
          message_id?: string | null
          request?: Json
          response?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      discord_link_states: {
        Row: {
          created_at: string
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      discover_items: {
        Row: {
          author: string | null
          banner_url: string | null
          category: string | null
          created_at: string
          description: string | null
          download_url: string | null
          external_url: string | null
          featured: boolean
          icon_url: string | null
          id: string
          kind: string
          long_description: string | null
          meta: Json
          name: string
          published: boolean
          slug: string | null
          tags: string[]
          updated_at: string
          user_id: string | null
          version: string | null
        }
        Insert: {
          author?: string | null
          banner_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          external_url?: string | null
          featured?: boolean
          icon_url?: string | null
          id?: string
          kind: string
          long_description?: string | null
          meta?: Json
          name: string
          published?: boolean
          slug?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
          version?: string | null
        }
        Update: {
          author?: string | null
          banner_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          external_url?: string | null
          featured?: boolean
          icon_url?: string | null
          id?: string
          kind?: string
          long_description?: string | null
          meta?: Json
          name?: string
          published?: boolean
          slug?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
          version?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_template_overrides: {
        Row: {
          body_markdown: string
          created_at: string
          enabled: boolean
          id: string
          subject: string
          template_name: string
          updated_at: string
          updated_by: string | null
          variant: string
        }
        Insert: {
          body_markdown: string
          created_at?: string
          enabled?: boolean
          id?: string
          subject: string
          template_name: string
          updated_at?: string
          updated_by?: string | null
          variant?: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          enabled?: boolean
          id?: string
          subject?: string
          template_name?: string
          updated_at?: string
          updated_by?: string | null
          variant?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          description: string
          ends_at: string | null
          id: string
          location: string | null
          published: boolean
          slug: string
          sort_order: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          published?: boolean
          slug: string
          sort_order?: number
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          published?: boolean
          slug?: string
          sort_order?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_votes: {
        Row: {
          created_at: string
          faq_id: string
          id: string
          user_id: string | null
          vote: string
          voter_key: string | null
        }
        Insert: {
          created_at?: string
          faq_id: string
          id?: string
          user_id?: string | null
          vote: string
          voter_key?: string | null
        }
        Update: {
          created_at?: string
          faq_id?: string
          id?: string
          user_id?: string | null
          vote?: string
          voter_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_votes_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          created_at: string
          description: string
          highlights: string[]
          icon: string
          id: string
          long_description: string
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          highlights?: string[]
          icon?: string
          id?: string
          long_description?: string
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          highlights?: string[]
          icon?: string
          id?: string
          long_description?: string
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          id: string
          image_url: string
          media_type: string
          published: boolean
          sort_order: number
          title: string | null
          updated_at: string
          video_provider: string | null
          video_url: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url: string
          media_type?: string
          published?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          video_provider?: string | null
          video_url?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string
          media_type?: string
          published?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          video_provider?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      game_modes: {
        Row: {
          accent: string
          banner_url: string | null
          created_at: string
          description: string | null
          features: string[]
          icon: string
          id: string
          long_description: string | null
          name: string
          published: boolean
          screenshots: string[]
          server_ip: string | null
          slug: string
          sort_order: number
          status: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          accent?: string
          banner_url?: string | null
          created_at?: string
          description?: string | null
          features?: string[]
          icon?: string
          id?: string
          long_description?: string | null
          name: string
          published?: boolean
          screenshots?: string[]
          server_ip?: string | null
          slug: string
          sort_order?: number
          status?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          accent?: string
          banner_url?: string | null
          created_at?: string
          description?: string | null
          features?: string[]
          icon?: string
          id?: string
          long_description?: string | null
          name?: string
          published?: boolean
          screenshots?: string[]
          server_ip?: string | null
          slug?: string
          sort_order?: number
          status?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      item_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          rating: number
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          rating: number
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          rating?: number
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      litebans_mysql_config: {
        Row: {
          database: string
          host: string
          id: boolean
          password: string
          port: number
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          database: string
          host: string
          id?: boolean
          password: string
          port?: number
          updated_at?: string
          updated_by?: string | null
          username: string
        }
        Update: {
          database?: string
          host?: string
          id?: boolean
          password?: string
          port?: number
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: []
      }
      login_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          device_id: string
          expires_at: string
          id: string
          ip: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          device_id: string
          expires_at: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          device_id?: string
          expires_at?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mc_console_commands: {
        Row: {
          command: string
          completed_at: string | null
          created_at: string
          id: string
          issued_by: string | null
          response: string | null
          sent_at: string | null
          server_id: string
          status: string
        }
        Insert: {
          command: string
          completed_at?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          response?: string | null
          sent_at?: string | null
          server_id: string
          status?: string
        }
        Update: {
          command?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          response?: string | null
          sent_at?: string | null
          server_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_console_commands_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "mc_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_console_logs: {
        Row: {
          id: number
          level: string
          line: string
          logged_at: string
          server_id: string
          source: string
        }
        Insert: {
          id?: number
          level?: string
          line: string
          logged_at?: string
          server_id: string
          source?: string
        }
        Update: {
          id?: number
          level?: string
          line?: string
          logged_at?: string
          server_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_console_logs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "mc_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_public_servers: {
        Row: {
          ip: string | null
          motd: string | null
          name: string
          online: boolean
          players_max: number
          players_online: number
          slug: string
          sort_order: number
          tps: number
          updated_at: string
          uptime_pct: number
        }
        Insert: {
          ip?: string | null
          motd?: string | null
          name: string
          online?: boolean
          players_max?: number
          players_online?: number
          slug: string
          sort_order?: number
          tps?: number
          updated_at?: string
          uptime_pct?: number
        }
        Update: {
          ip?: string | null
          motd?: string | null
          name?: string
          online?: boolean
          players_max?: number
          players_online?: number
          slug?: string
          sort_order?: number
          tps?: number
          updated_at?: string
          uptime_pct?: number
        }
        Relationships: []
      }
      mc_servers: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          enabled: boolean
          id: string
          ingest_secret: string
          last_seen_at: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          enabled?: boolean
          id?: string
          ingest_secret?: string
          last_seen_at?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          enabled?: boolean
          id?: string
          ingest_secret?: string
          last_seen_at?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      membership_tiers: {
        Row: {
          badge_label: string | null
          color: string
          created_at: string
          currency: string
          description: string | null
          featured: boolean
          id: string
          name: string
          perks: string[]
          price_lifetime: number | null
          price_monthly: number | null
          published: boolean
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          badge_label?: string | null
          color?: string
          created_at?: string
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          name: string
          perks?: string[]
          price_lifetime?: number | null
          price_monthly?: number | null
          published?: boolean
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          badge_label?: string | null
          color?: string
          created_at?: string
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          name?: string
          perks?: string[]
          price_lifetime?: number | null
          price_monthly?: number | null
          published?: boolean
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mod_likes: {
        Row: {
          created_at: string
          mod_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mod_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          mod_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mod_likes_mod_id_fkey"
            columns: ["mod_id"]
            isOneToOne: false
            referencedRelation: "mods"
            referencedColumns: ["id"]
          },
        ]
      }
      mod_reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          mod_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          mod_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          mod_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mod_reviews_mod_id_fkey"
            columns: ["mod_id"]
            isOneToOne: false
            referencedRelation: "mods"
            referencedColumns: ["id"]
          },
        ]
      }
      mod_saves: {
        Row: {
          created_at: string
          mod_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mod_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          mod_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mod_saves_mod_id_fkey"
            columns: ["mod_id"]
            isOneToOne: false
            referencedRelation: "mods"
            referencedColumns: ["id"]
          },
        ]
      }
      mods: {
        Row: {
          author: string | null
          category: string | null
          created_at: string
          description: string | null
          download_url: string | null
          featured: boolean
          icon_url: string | null
          id: string
          jar_filename: string | null
          jar_path: string | null
          jar_size: number | null
          loader: string | null
          loaders: string[]
          long_description: string | null
          mc_version: string | null
          mc_versions: string[]
          name: string
          org_id: string | null
          price: number
          published: boolean
          short_id: string
          slug: string
          sort_order: number
          tags: string[]
          updated_at: string
          version: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          featured?: boolean
          icon_url?: string | null
          id?: string
          jar_filename?: string | null
          jar_path?: string | null
          jar_size?: number | null
          loader?: string | null
          loaders?: string[]
          long_description?: string | null
          mc_version?: string | null
          mc_versions?: string[]
          name: string
          org_id?: string | null
          price?: number
          published?: boolean
          short_id?: string
          slug: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
          version?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          featured?: boolean
          icon_url?: string | null
          id?: string
          jar_filename?: string | null
          jar_path?: string | null
          jar_size?: number | null
          loader?: string | null
          loaders?: string[]
          long_description?: string | null
          mc_version?: string | null
          mc_versions?: string[]
          name?: string
          org_id?: string | null
          price?: number
          published?: boolean
          short_id?: string
          slug?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          priority: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          priority?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          priority?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_email_deliveries: {
        Row: {
          created_at: string
          error: string | null
          id: string
          is_test: boolean
          message_id: string | null
          news_id: string
          recipient_email: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          is_test?: boolean
          message_id?: string | null
          news_id: string
          recipient_email: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          is_test?: boolean
          message_id?: string | null
          news_id?: string
          recipient_email?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_email_deliveries_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      news_email_opt_outs: {
        Row: {
          created_at: string
          email: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          balance: number
          best_killstreak: number
          deaths: number
          id: string
          kills: number
          killstreak: number
          last_seen_at: string | null
          mob_kills: number
          player_name: string
          player_uuid: string
          playtime_seconds: number
          server_id: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          best_killstreak?: number
          deaths?: number
          id?: string
          kills?: number
          killstreak?: number
          last_seen_at?: string | null
          mob_kills?: number
          player_name: string
          player_uuid: string
          playtime_seconds?: number
          server_id?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          best_killstreak?: number
          deaths?: number
          id?: string
          kills?: number
          killstreak?: number
          last_seen_at?: string | null
          mob_kills?: number
          player_name?: string
          player_uuid?: string
          playtime_seconds?: number
          server_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "mc_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      player_tiers: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          player_name: string
          points: number
          region: string | null
          sort_order: number
          tier: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          player_name: string
          points?: number
          region?: string | null
          sort_order?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          player_name?: string
          points?: number
          region?: string | null
          sort_order?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      plugin_downloads: {
        Row: {
          created_at: string
          id: string
          plugin_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          plugin_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          plugin_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plugin_downloads_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      plugin_favorites: {
        Row: {
          created_at: string
          plugin_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          plugin_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          plugin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_favorites_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      plugin_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          download_url: string | null
          id: string
          jar_filename: string | null
          jar_path: string | null
          jar_size: number | null
          plugin_id: string
          version: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          download_url?: string | null
          id?: string
          jar_filename?: string | null
          jar_path?: string | null
          jar_size?: number | null
          plugin_id: string
          version: string
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          download_url?: string | null
          id?: string
          jar_filename?: string | null
          jar_path?: string | null
          jar_size?: number | null
          plugin_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_versions_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      plugins: {
        Row: {
          author: string | null
          category: string | null
          created_at: string
          description: string | null
          discord_url: string | null
          download_url: string | null
          featured: boolean
          icon_url: string | null
          id: string
          issues_url: string | null
          jar_filename: string | null
          jar_path: string | null
          jar_size: number | null
          license: string | null
          long_description: string | null
          mc_versions: string[]
          name: string
          org_id: string | null
          platform: string | null
          platforms: string[]
          price: number
          published: boolean
          screenshots: string[]
          short_id: string
          slug: string | null
          source_url: string | null
          tags: string[]
          updated_at: string
          user_id: string | null
          version: string | null
          website_url: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          download_url?: string | null
          featured?: boolean
          icon_url?: string | null
          id?: string
          issues_url?: string | null
          jar_filename?: string | null
          jar_path?: string | null
          jar_size?: number | null
          license?: string | null
          long_description?: string | null
          mc_versions?: string[]
          name: string
          org_id?: string | null
          platform?: string | null
          platforms?: string[]
          price?: number
          published?: boolean
          screenshots?: string[]
          short_id?: string
          slug?: string | null
          source_url?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
          version?: string | null
          website_url?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          download_url?: string | null
          featured?: boolean
          icon_url?: string | null
          id?: string
          issues_url?: string | null
          jar_filename?: string | null
          jar_path?: string | null
          jar_size?: number | null
          license?: string | null
          long_description?: string | null
          mc_versions?: string[]
          name?: string
          org_id?: string | null
          platform?: string | null
          platforms?: string[]
          price?: number
          published?: boolean
          screenshots?: string[]
          short_id?: string
          slug?: string | null
          source_url?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
          version?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plugins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          mc_username: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          mc_username?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          mc_username?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles_private: {
        Row: {
          created_at: string
          discord_avatar: string | null
          discord_id: string | null
          discord_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          duration_seconds: number
          id: string
          max_score: number
          passed: boolean
          percent: number
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          duration_seconds?: number
          id?: string
          max_score: number
          passed?: boolean
          percent: number
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          duration_seconds?: number
          id?: string
          max_score?: number
          passed?: boolean
          percent?: number
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          label: string
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          label: string
          question_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          label?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          points: number
          prompt: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          points?: number
          prompt: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          points?: number
          prompt?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          passing_score: number
          published: boolean
          randomize: boolean
          slug: string
          time_limit_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          passing_score?: number
          published?: boolean
          randomize?: boolean
          slug: string
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          passing_score?: number
          published?: boolean
          randomize?: boolean
          slug?: string
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rule_sections: {
        Row: {
          created_at: string
          icon: string
          id: string
          items: string[]
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          items?: string[]
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          items?: string[]
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          highlights: Json
          id: string
          name: string
          number: number | null
          published: boolean
          slug: string
          sort_order: number
          starts_at: string | null
          status: string
          summary: string | null
          theme: string | null
          updated_at: string
          winners: Json
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          highlights?: Json
          id?: string
          name: string
          number?: number | null
          published?: boolean
          slug: string
          sort_order?: number
          starts_at?: string | null
          status?: string
          summary?: string | null
          theme?: string | null
          updated_at?: string
          winners?: Json
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          highlights?: Json
          id?: string
          name?: string
          number?: number | null
          published?: boolean
          slug?: string
          sort_order?: number
          starts_at?: string | null
          status?: string
          summary?: string | null
          theme?: string | null
          updated_at?: string
          winners?: Json
        }
        Relationships: []
      }
      server_maps: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      server_panel_settings: {
        Row: {
          created_at: string
          id: string
          motd: string
          motd_color: string
          server_ip: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          motd?: string
          motd_color?: string
          server_ip?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          motd?: string
          motd_color?: string
          server_ip?: string
          updated_at?: string
        }
        Relationships: []
      }
      server_status: {
        Row: {
          id: number
          motd: string | null
          online: boolean
          players_max: number
          players_online: number
          updated_at: string
        }
        Insert: {
          id?: number
          motd?: string | null
          online?: boolean
          players_max?: number
          players_online?: number
          updated_at?: string
        }
        Update: {
          id?: number
          motd?: string | null
          online?: boolean
          players_max?: number
          players_online?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          created_at: string
          eyebrow: string
          highlight: string
          icon: string
          id: string
          intro: string
          published: boolean
          sections: Json
          seo_description: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
          updated_label: string
        }
        Insert: {
          created_at?: string
          eyebrow?: string
          highlight?: string
          icon?: string
          id?: string
          intro?: string
          published?: boolean
          sections?: Json
          seo_description?: string
          slug: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_label?: string
        }
        Update: {
          created_at?: string
          eyebrow?: string
          highlight?: string
          icon?: string
          id?: string
          intro?: string
          published?: boolean
          sections?: Json
          seo_description?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_label?: string
        }
        Relationships: []
      }
      status_subscribers: {
        Row: {
          confirmed: boolean
          created_at: string
          email: string
          id: string
          unsubscribe_token: string
          user_id: string | null
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          email: string
          id?: string
          unsubscribe_token?: string
          user_id?: string | null
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          email?: string
          id?: string
          unsubscribe_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          published: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          published?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          published?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          currency: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_subtotal: number
          public_listed: boolean
          starts_at: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_subtotal?: number
          public_listed?: boolean
          starts_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_subtotal?: number
          public_listed?: boolean
          starts_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      store_items: {
        Row: {
          badge: string | null
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          external_url: string | null
          featured: boolean
          id: string
          image_url: string | null
          name: string
          perks: string[]
          price: number
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          external_url?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          perks?: string[]
          price?: number
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          external_url?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          perks?: string[]
          price?: number
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_wishlists: {
        Row: {
          created_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_wishlists_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_staff: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_staff?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_last_viewed_at: string | null
          body: string
          category: string | null
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_last_viewed_at?: string | null
          body: string
          category?: string | null
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_last_viewed_at?: string | null
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tab_animations: {
        Row: {
          change_interval: number
          created_at: string
          id: string
          lines: Json
          name: string
          published: boolean
          sort_order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          change_interval?: number
          created_at?: string
          id?: string
          lines?: Json
          name: string
          published?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          change_interval?: number
          created_at?: string
          id?: string
          lines?: Json
          name?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          ip: string | null
          last_seen_at: string
          trusted_until: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          trusted_until: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          trusted_until?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      uptime_checks: {
        Row: {
          checked_at: string
          error: string | null
          id: string
          is_up: boolean
          latency_ms: number | null
          service_key: string
          status_code: number | null
        }
        Insert: {
          checked_at?: string
          error?: string | null
          id?: string
          is_up: boolean
          latency_ms?: number | null
          service_key: string
          status_code?: number | null
        }
        Update: {
          checked_at?: string
          error?: string | null
          id?: string
          is_up?: boolean
          latency_ms?: number | null
          service_key?: string
          status_code?: number | null
        }
        Relationships: []
      }
      uptime_incidents: {
        Row: {
          alerted: boolean
          closed_at: string | null
          created_at: string
          id: string
          incident_number: number
          last_error: string | null
          opened_at: string
          service_key: string
        }
        Insert: {
          alerted?: boolean
          closed_at?: string | null
          created_at?: string
          id?: string
          incident_number?: number
          last_error?: string | null
          opened_at?: string
          service_key: string
        }
        Update: {
          alerted?: boolean
          closed_at?: string | null
          created_at?: string
          id?: string
          incident_number?: number
          last_error?: string | null
          opened_at?: string
          service_key?: string
        }
        Relationships: []
      }
      user_custom_roles: {
        Row: {
          created_at: string
          id: string
          role_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["key"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string | null
          target_label: string | null
          target_type: string
          target_url: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type: string
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string
          target_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_servers: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          discord_url: string | null
          featured: boolean
          icon_url: string | null
          id: string
          ip: string
          long_description: string | null
          name: string
          port: number | null
          published: boolean
          slug: string
          tags: string[]
          updated_at: string
          user_id: string
          version: string | null
          website_url: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          featured?: boolean
          icon_url?: string | null
          id?: string
          ip: string
          long_description?: string | null
          name: string
          port?: number | null
          published?: boolean
          slug: string
          tags?: string[]
          updated_at?: string
          user_id: string
          version?: string | null
          website_url?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          featured?: boolean
          icon_url?: string | null
          id?: string
          ip?: string
          long_description?: string | null
          name?: string
          port?: number | null
          published?: boolean
          slug?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          version?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      user_skripts: {
        Row: {
          created_at: string
          description: string | null
          downloads: number
          filename: string
          icon_url: string | null
          id: string
          name: string
          published: boolean
          size_bytes: number | null
          storage_path: string
          tags: string[]
          updated_at: string
          uploaded_by: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          downloads?: number
          filename: string
          icon_url?: string | null
          id?: string
          name: string
          published?: boolean
          size_bytes?: number | null
          storage_path: string
          tags?: string[]
          updated_at?: string
          uploaded_by: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          downloads?: number
          filename?: string
          icon_url?: string | null
          id?: string
          name?: string
          published?: boolean
          size_bytes?: number | null
          storage_path?: string
          tags?: string[]
          updated_at?: string
          uploaded_by?: string
          version?: string | null
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          last_login_date: string | null
          last_vote_date: string | null
          login_best: number
          login_streak: number
          total_logins: number
          total_votes: number
          updated_at: string
          user_id: string
          vote_best: number
          vote_streak: number
        }
        Insert: {
          created_at?: string
          last_login_date?: string | null
          last_vote_date?: string | null
          login_best?: number
          login_streak?: number
          total_logins?: number
          total_votes?: number
          updated_at?: string
          user_id: string
          vote_best?: number
          vote_streak?: number
        }
        Update: {
          created_at?: string
          last_login_date?: string | null
          last_vote_date?: string | null
          login_best?: number
          login_streak?: number
          total_logins?: number
          total_votes?: number
          updated_at?: string
          user_id?: string
          vote_best?: number
          vote_streak?: number
        }
        Relationships: []
      }
      vote_links: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          reward: string
          site_key: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          reward?: string
          site_key: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          reward?: string
          site_key?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      website_webhook_deliveries: {
        Row: {
          attempted_at: string
          error: string | null
          id: string
          kind: string
          latency_ms: number | null
          ok: boolean
          status_code: number | null
          url_host: string | null
        }
        Insert: {
          attempted_at?: string
          error?: string | null
          id?: string
          kind: string
          latency_ms?: number | null
          ok?: boolean
          status_code?: number | null
          url_host?: string | null
        }
        Update: {
          attempted_at?: string
          error?: string | null
          id?: string
          kind?: string
          latency_ms?: number | null
          ok?: boolean
          status_code?: number | null
          url_host?: string | null
        }
        Relationships: []
      }
      wiki_articles: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      faq_vote_counts: {
        Row: {
          faq_id: string | null
          helpful: number | null
          not_helpful: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_votes_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_application_notes: {
        Args: { _ids: string[] }
        Returns: {
          id: string
          reviewer_notes: string
        }[]
      }
      admin_get_report_notes: {
        Args: { _ids: string[] }
        Returns: {
          admin_notes: string
          id: string
        }[]
      }
      admin_get_user_email: { Args: { _user_id: string }; Returns: string }
      apply_creator_code: {
        Args: { _code: string }
        Returns: {
          code: string
          creator_name: string
          discount_percent: number
          id: string
        }[]
      }
      can_access_ticket: { Args: { _ticket_id: string }; Returns: boolean }
      check_is_admin_logged: {
        Args: { _context?: string; _user_agent?: string }
        Returns: boolean
      }
      discover_items_slugify: { Args: { _name: string }; Returns: string }
      gen_plugin_short_id: { Args: never; Returns: string }
      get_anon_faq_votes: {
        Args: { _voter_key: string }
        Returns: {
          faq_id: string
          vote: string
        }[]
      }
      get_follower_count: { Args: { _user_id: string }; Returns: number }
      get_following_count: { Args: { _user_id: string }; Returns: number }
      get_mod_like_counts: {
        Args: { _mod_ids: string[] }
        Returns: {
          likes: number
          mod_id: string
        }[]
      }
      get_my_organizations: {
        Args: never
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      get_my_private_profile: {
        Args: never
        Returns: {
          discord_avatar: string
          discord_id: string
          discord_username: string
          preferences: Json
        }[]
      }
      get_my_recent_plugin_downloads: {
        Args: { _limit?: number }
        Returns: {
          download_count: number
          last_downloaded: string
          plugin_id: string
        }[]
      }
      get_player_stats_by_name: {
        Args: { _player_name: string }
        Returns: {
          balance: number
          best_killstreak: number
          deaths: number
          kdr: number
          kills: number
          killstreak: number
          last_seen_at: string
          mob_kills: number
          player_name: string
          playtime_seconds: number
          updated_at: string
        }[]
      }
      get_plugin_download_counts: {
        Args: { _plugin_ids?: string[] }
        Returns: {
          last_30d: number
          last_7d: number
          plugin_id: string
          total: number
        }[]
      }
      get_plugin_favorite_counts: {
        Args: { _plugin_ids?: string[] }
        Returns: {
          plugin_id: string
          total: number
        }[]
      }
      get_popular_store_items: {
        Args: { _limit?: number }
        Returns: {
          item_id: string
          wishlist_count: number
        }[]
      }
      get_public_active_uptime_incidents: {
        Args: { _limit?: number }
        Returns: {
          closed_at: string
          id: string
          incident_number: number
          last_error: string
          opened_at: string
          service_key: string
        }[]
      }
      get_public_item_reviews: {
        Args: { _target_id: string; _target_type: string }
        Returns: {
          author_avatar: string
          author_mc_username: string
          author_name: string
          author_ref: string
          body: string
          created_at: string
          id: string
          is_mine: boolean
          rating: number
          updated_at: string
        }[]
      }
      get_public_mod_reviews: {
        Args: { _mod_id: string }
        Returns: {
          author_avatar: string
          author_mc_username: string
          author_name: string
          author_ref: string
          body: string
          created_at: string
          id: string
          is_mine: boolean
          rating: number
          updated_at: string
        }[]
      }
      get_public_reviews: {
        Args: { _limit?: number }
        Returns: {
          author_avatar: string
          author_mc_username: string
          author_name: string
          author_ref: string
          body: string
          created_at: string
          id: string
          is_mine: boolean
          rating: number
          updated_at: string
        }[]
      }
      get_public_uptime_checks_between: {
        Args: { _from: string; _service_key: string; _to: string }
        Returns: {
          checked_at: string
          error: string
          id: string
          is_up: boolean
          latency_ms: number
          status_code: number
        }[]
      }
      get_public_uptime_checks_for_service: {
        Args: { _limit?: number; _service_key: string }
        Returns: {
          checked_at: string
          error: string
          id: string
          is_up: boolean
          latency_ms: number
          status_code: number
        }[]
      }
      get_public_uptime_incident_by_number: {
        Args: { _number: number }
        Returns: {
          closed_at: string
          id: string
          incident_number: number
          last_error: string
          opened_at: string
          service_key: string
        }[]
      }
      get_public_uptime_incidents: {
        Args: { _limit?: number }
        Returns: {
          closed_at: string
          id: string
          incident_number: number
          last_error: string
          opened_at: string
          service_key: string
        }[]
      }
      get_quiz_explanations: {
        Args: { _question_ids: string[] }
        Returns: {
          explanation: string
          id: string
          prompt: string
        }[]
      }
      get_quiz_leaderboard: {
        Args: { _limit?: number; _slug: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          duration_seconds: number
          max_score: number
          percent: number
          rank: number
          score: number
          user_id: string
        }[]
      }
      get_quiz_question_counts: {
        Args: { _quiz_ids: string[] }
        Returns: {
          quiz_id: string
          total: number
        }[]
      }
      get_quiz_with_questions: { Args: { _slug: string }; Returns: Json }
      get_stats_leaderboard: {
        Args: { _limit?: number; _metric: string }
        Returns: {
          balance: number
          best_killstreak: number
          deaths: number
          kdr: number
          kills: number
          killstreak: number
          mob_kills: number
          player_name: string
          playtime_seconds: number
        }[]
      }
      get_streak_leaderboard: {
        Args: { _limit?: number; _metric?: string }
        Returns: {
          avatar_url: string
          display_name: string
          login_best: number
          login_streak: number
          mc_username: string
          total_logins: number
          total_votes: number
          user_id: string
          vote_best: number
          vote_streak: number
        }[]
      }
      get_trending_plugins: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          downloads: number
          plugin_id: string
        }[]
      }
      get_uptime_daily: {
        Args: { _days?: number }
        Returns: {
          day: string
          service_key: string
          total_checks: number
          up_checks: number
          uptime_pct: number
        }[]
      }
      grant_membership_rank: { Args: { _slug: string }; Returns: string }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: { Args: { _org_id: string }; Returns: boolean }
      is_organization_owner: { Args: { _org_id: string }; Returns: boolean }
      is_staff_user: { Args: { _uid: string }; Returns: boolean }
      list_public_coupons: {
        Args: { _limit?: number }
        Returns: {
          code: string
          currency: string
          description: string
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          min_subtotal: number
        }[]
      }
      mc_server_get_ingest_secret: {
        Args: { _server_id: string }
        Returns: string
      }
      mc_server_rotate_secret: { Args: { _server_id: string }; Returns: string }
      record_login_streak: {
        Args: never
        Returns: {
          created_at: string
          last_login_date: string | null
          last_vote_date: string | null
          login_best: number
          login_streak: number
          total_logins: number
          total_votes: number
          updated_at: string
          user_id: string
          vote_best: number
          vote_streak: number
        }
        SetofOptions: {
          from: "*"
          to: "user_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_plugin_download: {
        Args: { _plugin_id: string }
        Returns: undefined
      }
      record_user_skript_download: {
        Args: { _skript_id: string }
        Returns: undefined
      }
      record_vote_streak: {
        Args: never
        Returns: {
          created_at: string
          last_login_date: string | null
          last_vote_date: string | null
          login_best: number
          login_streak: number
          total_logins: number
          total_votes: number
          updated_at: string
          user_id: string
          vote_best: number
          vote_streak: number
        }
        SetofOptions: {
          from: "*"
          to: "user_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      slugify: { Args: { _input: string }; Returns: string }
      status_unsubscribe: { Args: { _token: string }; Returns: boolean }
      submit_quiz_attempt: {
        Args: { _answers: Json; _duration_seconds: number; _quiz_id: string }
        Returns: string
      }
      toggle_plugin_favorite: { Args: { _plugin_id: string }; Returns: boolean }
      validate_creator_code: {
        Args: { _code: string }
        Returns: {
          code: string
          creator_name: string
          discount_percent: number
          id: string
          limit_reached: boolean
        }[]
      }
      validate_store_coupon: {
        Args: { _code: string }
        Returns: {
          code: string
          currency: string
          description: string
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          limit_reached: boolean
          min_subtotal: number
          starts_at: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "owner"
        | "manager"
        | "developer"
        | "sr_admin"
        | "jr_admin"
        | "sr_mod"
        | "mod"
        | "sr_helper"
        | "helper"
        | "champion"
        | "media"
        | "elite"
        | "mvp"
        | "vip"
        | "booster"
        | "default"
        | "director"
        | "exec_manager"
        | "sr_manager"
        | "community_manager"
        | "lead_developer"
        | "jr_developer"
        | "bot_developer"
        | "trial_admin"
        | "trial_mod"
        | "chat_monitor"
        | "trainee"
        | "partner"
        | "content_creator"
        | "og"
        | "member"
        | "donut_plus"
        | "havoc"
        | "havoc_plus"
        | "builder"
        | "blood"
        | "blood_plus"
        | "chaos"
        | "chaos_plus"
        | "titan"
        | "immortal"
        | "founder"
        | "guardian"
        | "sentinel"
        | "warden"
        | "ascendant"
      application_status: "pending" | "approved" | "rejected" | "reviewed"
      application_type: "staff" | "builder" | "youtuber"
      org_member_role: "owner" | "admin" | "member"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "waiting_user" | "closed"
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
      app_role: [
        "admin",
        "user",
        "owner",
        "manager",
        "developer",
        "sr_admin",
        "jr_admin",
        "sr_mod",
        "mod",
        "sr_helper",
        "helper",
        "champion",
        "media",
        "elite",
        "mvp",
        "vip",
        "booster",
        "default",
        "director",
        "exec_manager",
        "sr_manager",
        "community_manager",
        "lead_developer",
        "jr_developer",
        "bot_developer",
        "trial_admin",
        "trial_mod",
        "chat_monitor",
        "trainee",
        "partner",
        "content_creator",
        "og",
        "member",
        "donut_plus",
        "havoc",
        "havoc_plus",
        "builder",
        "blood",
        "blood_plus",
        "chaos",
        "chaos_plus",
        "titan",
        "immortal",
        "founder",
        "guardian",
        "sentinel",
        "warden",
        "ascendant",
      ],
      application_status: ["pending", "approved", "rejected", "reviewed"],
      application_type: ["staff", "builder", "youtuber"],
      org_member_role: ["owner", "admin", "member"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["open", "in_progress", "waiting_user", "closed"],
    },
  },
} as const

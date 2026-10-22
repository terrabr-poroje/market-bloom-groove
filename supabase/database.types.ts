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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_recovery_codes: {
        Row: {
          auth_user_id: string
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          auth_user_id: string
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          auth_user_id?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      admin_user_cities: {
        Row: {
          admin_user_id: string
          city_name: string
          created_at: string
        }
        Insert: {
          admin_user_id: string
          city_name: string
          created_at?: string
        }
        Update: {
          admin_user_id?: string
          city_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_cities_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_cities_city_name_fkey"
            columns: ["city_name"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_name"]
          },
        ]
      }
      admin_users: {
        Row: {
          admin_role: string
          auth_user_id: string
          city: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          is_active: boolean
          login_username: string | null
        }
        Insert: {
          admin_role: string
          auth_user_id: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          login_username?: string | null
        }
        Update: {
          admin_role?: string
          auth_user_id?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          login_username?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_member_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_member_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_member_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          city_name: string
          created_at: string
          is_active: boolean
        }
        Insert: {
          city_name: string
          created_at?: string
          is_active?: boolean
        }
        Update: {
          city_name?: string
          created_at?: string
          is_active?: boolean
        }
        Relationships: []
      }
      city_neighbors: {
        Row: {
          city_name: string
          created_at: string
          is_enabled: boolean
          neighbor_city_name: string
        }
        Insert: {
          city_name: string
          created_at?: string
          is_enabled?: boolean
          neighbor_city_name: string
        }
        Update: {
          city_name?: string
          created_at?: string
          is_enabled?: boolean
          neighbor_city_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_neighbors_city_name_fkey"
            columns: ["city_name"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_name"]
          },
          {
            foreignKeyName: "city_neighbors_neighbor_city_name_fkey"
            columns: ["neighbor_city_name"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_name"]
          },
        ]
      }
      load_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          load_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          load_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          load_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "load_images_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      load_price_tiers: {
        Row: {
          created_at: string
          id: string
          load_id: string
          max_quantity: number | null
          min_quantity: number
          minimum_packages: number
          sale_type: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          load_id: string
          max_quantity?: number | null
          min_quantity?: number
          minimum_packages?: number
          sale_type?: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          load_id?: string
          max_quantity?: number | null
          min_quantity?: number
          minimum_packages?: number
          sale_type?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "load_price_tiers_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      loads: {
        Row: {
          ad_end_date: string | null
          ad_start_date: string | null
          archived_at: string | null
          archived_by: string | null
          archived_previous_status: string | null
          city: string
          contact_phone: string | null
          count: number | null
          created_at: string
          description: string | null
          engine: string | null
          id: string
          member_id: string
          min_order_quantity: number | null
          min_quantity: number | null
          name: string
          origin: string
          owner_member_id: string | null
          package_type: string
          package_weight: number
          price: number
          price_unit: string
          product_type: string
          quality: string | null
          quantity: number
          ready_date: string
          response_end_time: string | null
          response_start_time: string | null
          role: string
          sale_type: string | null
          seller_type: string | null
          source_market: string | null
          source_region: string | null
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          ad_end_date?: string | null
          ad_start_date?: string | null
          archived_at?: string | null
          archived_by?: string | null
          archived_previous_status?: string | null
          city: string
          contact_phone?: string | null
          count?: number | null
          created_at?: string
          description?: string | null
          engine?: string | null
          id?: string
          member_id: string
          min_order_quantity?: number | null
          min_quantity?: number | null
          name: string
          origin: string
          owner_member_id?: string | null
          package_type?: string
          package_weight?: number
          price: number
          price_unit: string
          product_type: string
          quality?: string | null
          quantity: number
          ready_date: string
          response_end_time?: string | null
          response_start_time?: string | null
          role: string
          sale_type?: string | null
          seller_type?: string | null
          source_market?: string | null
          source_region?: string | null
          status?: string
          unit: string
          updated_at?: string
        }
        Update: {
          ad_end_date?: string | null
          ad_start_date?: string | null
          archived_at?: string | null
          archived_by?: string | null
          archived_previous_status?: string | null
          city?: string
          contact_phone?: string | null
          count?: number | null
          created_at?: string
          description?: string | null
          engine?: string | null
          id?: string
          member_id?: string
          min_order_quantity?: number | null
          min_quantity?: number | null
          name?: string
          origin?: string
          owner_member_id?: string | null
          package_type?: string
          package_weight?: number
          price?: number
          price_unit?: string
          product_type?: string
          quality?: string | null
          quantity?: number
          ready_date?: string
          response_end_time?: string | null
          response_start_time?: string | null
          role?: string
          sale_type?: string | null
          seller_type?: string | null
          source_market?: string | null
          source_region?: string | null
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loads_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          member_id: string
          request_note: string | null
          role_code: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          member_id: string
          request_note?: string | null
          role_code: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          member_id?: string
          request_note?: string | null
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          auth_user_id: string | null
          city: string
          email: string | null
          full_name: string
          id: string
          is_archived: boolean
          joined_at: string
          phone: string | null
          products: string | null
          role: string
          verification_status: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          auth_user_id?: string | null
          city: string
          email?: string | null
          full_name: string
          id?: string
          is_archived?: boolean
          joined_at?: string
          phone?: string | null
          products?: string | null
          role: string
          verification_status?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          auth_user_id?: string | null
          city?: string
          email?: string | null
          full_name?: string
          id?: string
          is_archived?: boolean
          joined_at?: string
          phone?: string | null
          products?: string | null
          role?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string | null
          name: string
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language?: string | null
          name: string
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string | null
          name?: string
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_member_id: string | null
          created_at: string
          customer_city: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_confirmation_method: string | null
          delivery_confirmed_by: string | null
          delivery_status: string
          delivery_type: string | null
          id: string
          invoice_number: number
          load_id: string
          notes: string | null
          paid_at: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          price: number | null
          quantity: number
          sale_type: string
          seller_member_id: string | null
          shipped_at: string | null
          status: string
          total_price: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          buyer_member_id?: string | null
          created_at?: string
          customer_city: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_confirmation_method?: string | null
          delivery_confirmed_by?: string | null
          delivery_status?: string
          delivery_type?: string | null
          id?: string
          invoice_number?: number
          load_id: string
          notes?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          price?: number | null
          quantity: number
          sale_type?: string
          seller_member_id?: string | null
          shipped_at?: string | null
          status?: string
          total_price?: number | null
          unit: string
          updated_at?: string
        }
        Update: {
          buyer_member_id?: string | null
          created_at?: string
          customer_city?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_confirmation_method?: string | null
          delivery_confirmed_by?: string | null
          delivery_status?: string
          delivery_type?: string | null
          id?: string
          invoice_number?: number
          load_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          price?: number | null
          quantity?: number
          sale_type?: string
          seller_member_id?: string | null
          shipped_at?: string | null
          status?: string
          total_price?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_member_id_fkey"
            columns: ["buyer_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_member_id_fkey"
            columns: ["seller_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      outgoing_messages: {
        Row: {
          connection_id: string
          created_at: string
          external_message_id: string | null
          id: string
          message_text: string | null
          message_type: string | null
          recipient_id: string | null
          recipient_phone: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "outgoing_messages_connection_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_financial_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          description: string
          entry_status: string
          entry_type: string
          external_reference: string | null
          id: string
          idempotency_key: string | null
          member_id: string | null
          occurred_at: string | null
          order_id: string | null
          provider: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          entry_status?: string
          entry_type: string
          external_reference?: string | null
          id?: string
          idempotency_key?: string | null
          member_id?: string | null
          occurred_at?: string | null
          order_id?: string | null
          provider?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          entry_status?: string
          entry_type?: string
          external_reference?: string | null
          id?: string
          idempotency_key?: string | null
          member_id?: string | null
          occurred_at?: string | null
          order_id?: string | null
          provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_financial_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_financial_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          buyer_member_id: string | null
          created_at: string
          destination_city: string | null
          id: string
          load_id: string | null
          needed_by: string | null
          notes: string | null
          product_type: string
          quality_requirements: string | null
          quantity: number
          quantity_unit: string
          request_number: number
          status: string
          updated_at: string
        }
        Insert: {
          buyer_member_id?: string | null
          created_at?: string
          destination_city?: string | null
          id?: string
          load_id?: string | null
          needed_by?: string | null
          notes?: string | null
          product_type: string
          quality_requirements?: string | null
          quantity: number
          quantity_unit?: string
          request_number?: number
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_member_id?: string | null
          created_at?: string
          destination_city?: string | null
          id?: string
          load_id?: string | null
          needed_by?: string | null
          notes?: string | null
          product_type?: string
          quality_requirements?: string | null
          quantity?: number
          quantity_unit?: string
          request_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_buyer_member_id_fkey"
            columns: ["buyer_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          rating_id: string
          sender_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          rating_id: string
          sender_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          rating_id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_messages_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          order_id: string
          review_text: string | null
          reviewer_member_id: string
          score: number
          target_load_id: string | null
          target_member_id: string | null
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          order_id: string
          review_text?: string | null
          reviewer_member_id: string
          score: number
          target_load_id?: string | null
          target_member_id?: string | null
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          order_id?: string
          review_text?: string | null
          reviewer_member_id?: string
          score?: number
          target_load_id?: string | null
          target_member_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewer_member_id_fkey"
            columns: ["reviewer_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_target_load_id_fkey"
            columns: ["target_load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_bank_accounts: {
        Row: {
          account_holder_name: string
          bank_name: string
          created_at: string
          iban: string
          id: string
          member_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          account_holder_name: string
          bank_name: string
          created_at?: string
          iban: string
          id?: string
          member_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          account_holder_name?: string
          bank_name?: string
          created_at?: string
          iban?: string
          id?: string
          member_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_bank_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_financial_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          member_id: string
          order_id: string | null
          payout_status: string
          processed_at: string | null
          processed_by: string | null
          reference_code: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          member_id: string
          order_id?: string | null
          payout_status?: string
          processed_at?: string | null
          processed_by?: string | null
          reference_code?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          member_id?: string
          order_id?: string | null
          payout_status?: string
          processed_at?: string | null
          processed_by?: string | null
          reference_code?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_financial_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_financial_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          id: string
          member_id: string | null
          route: string
          user_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          member_id?: string | null
          route: string
          user_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          member_id?: string | null
          route?: string
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          account_id: string | null
          account_name: string | null
          connected_at: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_contacts: {
        Row: {
          city: string | null
          created_at: string
          external_user_id: string | null
          full_name: string | null
          id: string
          member_id: string | null
          phone: string | null
          platform: string
          role: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          external_user_id?: string | null
          full_name?: string | null
          id?: string
          member_id?: string | null
          phone?: string | null
          platform: string
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          external_user_id?: string | null
          full_name?: string | null
          id?: string
          member_id?: string | null
          phone?: string | null
          platform?: string
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_contacts_member_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      social_messages: {
        Row: {
          connection_id: string
          created_at: string
          external_message_id: string | null
          id: string
          message_text: string | null
          message_type: string | null
          platform: string
          processed: boolean
          received_at: string
          sender_id: string | null
          sender_name: string | null
          sender_phone: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          platform: string
          processed?: boolean
          received_at?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_phone?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          platform?: string
          processed?: boolean
          received_at?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_messages_connection_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          connection_id: string
          content: string | null
          created_at: string
          external_post_id: string | null
          id: string
          media_url: string | null
          platform: string
          published_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          content?: string | null
          created_at?: string
          external_post_id?: string | null
          id?: string
          media_url?: string | null
          platform: string
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          content?: string | null
          created_at?: string
          external_post_id?: string | null
          id?: string
          media_url?: string | null
          platform?: string
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_connection_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_type: string | null
          external_event_id: string | null
          id: string
          payload: Json | null
          platform: string
          processed: boolean
          processed_at: string | null
          received_at: string
        }
        Insert: {
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          payload?: Json | null
          platform: string
          processed?: boolean
          processed_at?: string | null
          received_at?: string
        }
        Update: {
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          payload?: Json | null
          platform?: string
          processed?: boolean
          processed_at?: string | null
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      site_visit_summary: {
        Row: {
          total_visits: number | null
          unique_visitors: number | null
          visitors_last_24_hours: number | null
          visits_last_24_hours: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_storefront_member: {
        Args: { p_member_id: string }
        Returns: {
          city: string
          full_name: string
          id: string
          role: string
          verification_status: string
        }[]
      }
      terrabar_admin_archive_load: {
        Args: { p_load_id: string }
        Returns: undefined
      }
      terrabar_admin_archive_member: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      terrabar_admin_create_payout: {
        Args: {
          p_amount: number
          p_description?: string
          p_member_id: string
          p_reference_code?: string
        }
        Returns: string
      }
      terrabar_admin_restore_load: {
        Args: { p_load_id: string }
        Returns: undefined
      }
      terrabar_admin_restore_member: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      terrabar_admin_update_payout_status: {
        Args: {
          p_reference_code?: string
          p_status: string
          p_transaction_id: string
        }
        Returns: string
      }
      terrabar_is_city_manager: {
        Args: { target_city: string }
        Returns: boolean
      }
      terrabar_is_main_admin: { Args: never; Returns: boolean }
      terrabar_order_pricing_valid: {
        Args: {
          p_load_id: string
          p_price: number
          p_quantity: number
          p_sale_type: string
          p_total: number
        }
        Returns: boolean
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
    Enums: {},
  },
} as const

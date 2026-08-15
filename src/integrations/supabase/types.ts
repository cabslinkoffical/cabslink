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
      activity_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          active: boolean
          comparable_value: string | null
          created_at: string
          dropoff_charge: number
          id: string
          label: string | null
          name: string
          notes: string | null
          pickup_charge: number
          place_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          comparable_value?: string | null
          created_at?: string
          dropoff_charge?: number
          id?: string
          label?: string | null
          name: string
          notes?: string | null
          pickup_charge?: number
          place_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          comparable_value?: string | null
          created_at?: string
          dropoff_charge?: number
          id?: string
          label?: string | null
          name?: string
          notes?: string | null
          pickup_charge?: number
          place_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      availability_rules: {
        Row: {
          active: boolean
          created_at: string
          date_from: string | null
          date_to: string | null
          days_of_week: number[] | null
          effect: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          place_id: string | null
          place_label: string | null
          priority: number
          radius_miles: number | null
          reason: string | null
          rule_scope: string
          scope: string
          service_types: string[] | null
          time_from: string | null
          time_to: string | null
          updated_at: string
          vehicle_class_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          days_of_week?: number[] | null
          effect?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          place_id?: string | null
          place_label?: string | null
          priority?: number
          radius_miles?: number | null
          reason?: string | null
          rule_scope?: string
          scope?: string
          service_types?: string[] | null
          time_from?: string | null
          time_to?: string | null
          updated_at?: string
          vehicle_class_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          days_of_week?: number[] | null
          effect?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          place_id?: string | null
          place_label?: string | null
          priority?: number
          radius_miles?: number | null
          reason?: string | null
          rule_scope?: string
          scope?: string
          service_types?: string[] | null
          time_from?: string | null
          time_to?: string | null
          updated_at?: string
          vehicle_class_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_addresses: {
        Row: {
          active: boolean
          address: string
          admin_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          admin_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          admin_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_authors: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          links: Json
          name: string
          role: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          links?: Json
          name: string
          role?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          links?: Json
          name?: string
          role?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          meta_description: string | null
          name: string
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          meta_description?: string | null
          name: string
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          meta_description?: string | null
          name?: string
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          body_html_cache: string | null
          body_md: string
          canonical_override: string | null
          category_id: string | null
          cluster_key: string | null
          created_at: string
          excerpt: string | null
          faqs: Json
          featured: boolean
          featured_image_alt: string | null
          featured_image_url: string | null
          id: string
          key_takeaways: Json
          last_reviewed_at: string | null
          meta_description: string | null
          og_image_url: string | null
          pillar: boolean
          published_at: string | null
          reading_minutes: number
          related_location_slugs: string[]
          related_post_ids: string[]
          related_route_slugs: string[]
          related_service_slugs: string[]
          robots_status: string
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          subtitle: string | null
          title: string
          toc: Json
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id?: string | null
          body_html_cache?: string | null
          body_md?: string
          canonical_override?: string | null
          category_id?: string | null
          cluster_key?: string | null
          created_at?: string
          excerpt?: string | null
          faqs?: Json
          featured?: boolean
          featured_image_alt?: string | null
          featured_image_url?: string | null
          id?: string
          key_takeaways?: Json
          last_reviewed_at?: string | null
          meta_description?: string | null
          og_image_url?: string | null
          pillar?: boolean
          published_at?: string | null
          reading_minutes?: number
          related_location_slugs?: string[]
          related_post_ids?: string[]
          related_route_slugs?: string[]
          related_service_slugs?: string[]
          robots_status?: string
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          subtitle?: string | null
          title: string
          toc?: Json
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string | null
          body_html_cache?: string | null
          body_md?: string
          canonical_override?: string | null
          category_id?: string | null
          cluster_key?: string | null
          created_at?: string
          excerpt?: string | null
          faqs?: Json
          featured?: boolean
          featured_image_alt?: string | null
          featured_image_url?: string | null
          id?: string
          key_takeaways?: Json
          last_reviewed_at?: string | null
          meta_description?: string | null
          og_image_url?: string | null
          pillar?: boolean
          published_at?: string | null
          reading_minutes?: number
          related_location_slugs?: string[]
          related_post_ids?: string[]
          related_route_slugs?: string[]
          related_service_slugs?: string[]
          robots_status?: string
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          subtitle?: string | null
          title?: string
          toc?: Json
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      booking_status_transitions: {
        Row: {
          actor_id: string | null
          booking_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["booking_status"] | null
          id: string
          override: boolean
          reason: string | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          actor_id?: string | null
          booking_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          override?: boolean
          reason?: string | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          override?: boolean
          reason?: string | null
          to_status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_transitions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          admin_notes: string | null
          applied_rules: Json | null
          assigned_at: string | null
          booking_ref: string | null
          cancellation_reason: string | null
          child_seat: boolean
          child_seat_count: number
          confirmation_token_expires_at: string | null
          confirmation_token_hash: string | null
          created_at: string
          customer_name: string
          deleted_at: string | null
          distance_miles: number | null
          driver_id: string | null
          driving_duration_seconds: number | null
          dropoff_address: string
          dropoff_place_id: string | null
          email: string
          engine_version: string | null
          flight_number: string | null
          hourly_hours: number | null
          hourly_rate_per_hour: number | null
          id: string
          idempotency_key: string | null
          idempotency_request_hash: string | null
          luggage: number
          meet_greet: boolean
          notes: string | null
          original_service_type: string
          passengers: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          pickup_address: string
          pickup_date: string
          pickup_place_id: string | null
          pickup_time: string
          planned_stop_duration_seconds: number
          price: number | null
          pricing_profile_id_snapshot: string | null
          pricing_snapshot: Json | null
          pricing_source: string | null
          quote_expires_at: string | null
          quote_id: string | null
          return_journey: boolean
          route_legs: Json
          scenic_template_id: string | null
          selected_pois: Json
          service_type: string
          status: Database["public"]["Enums"]["booking_status"]
          stops_fingerprint: string | null
          total_journey_seconds: number | null
          tour_conversion_ack_at: string | null
          updated_at: string
          vehicle_capacity_snapshot: Json | null
          vehicle_class_id: string | null
          vehicle_class_name_snapshot: string | null
          vehicle_id: string | null
          vehicle_name_snapshot: string | null
          vehicle_type: string
        }
        Insert: {
          admin_notes?: string | null
          applied_rules?: Json | null
          assigned_at?: string | null
          booking_ref?: string | null
          cancellation_reason?: string | null
          child_seat?: boolean
          child_seat_count?: number
          confirmation_token_expires_at?: string | null
          confirmation_token_hash?: string | null
          created_at?: string
          customer_name: string
          deleted_at?: string | null
          distance_miles?: number | null
          driver_id?: string | null
          driving_duration_seconds?: number | null
          dropoff_address: string
          dropoff_place_id?: string | null
          email: string
          engine_version?: string | null
          flight_number?: string | null
          hourly_hours?: number | null
          hourly_rate_per_hour?: number | null
          id?: string
          idempotency_key?: string | null
          idempotency_request_hash?: string | null
          luggage?: number
          meet_greet?: boolean
          notes?: string | null
          original_service_type?: string
          passengers?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          pickup_address: string
          pickup_date: string
          pickup_place_id?: string | null
          pickup_time: string
          planned_stop_duration_seconds?: number
          price?: number | null
          pricing_profile_id_snapshot?: string | null
          pricing_snapshot?: Json | null
          pricing_source?: string | null
          quote_expires_at?: string | null
          quote_id?: string | null
          return_journey?: boolean
          route_legs?: Json
          scenic_template_id?: string | null
          selected_pois?: Json
          service_type?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stops_fingerprint?: string | null
          total_journey_seconds?: number | null
          tour_conversion_ack_at?: string | null
          updated_at?: string
          vehicle_capacity_snapshot?: Json | null
          vehicle_class_id?: string | null
          vehicle_class_name_snapshot?: string | null
          vehicle_id?: string | null
          vehicle_name_snapshot?: string | null
          vehicle_type: string
        }
        Update: {
          admin_notes?: string | null
          applied_rules?: Json | null
          assigned_at?: string | null
          booking_ref?: string | null
          cancellation_reason?: string | null
          child_seat?: boolean
          child_seat_count?: number
          confirmation_token_expires_at?: string | null
          confirmation_token_hash?: string | null
          created_at?: string
          customer_name?: string
          deleted_at?: string | null
          distance_miles?: number | null
          driver_id?: string | null
          driving_duration_seconds?: number | null
          dropoff_address?: string
          dropoff_place_id?: string | null
          email?: string
          engine_version?: string | null
          flight_number?: string | null
          hourly_hours?: number | null
          hourly_rate_per_hour?: number | null
          id?: string
          idempotency_key?: string | null
          idempotency_request_hash?: string | null
          luggage?: number
          meet_greet?: boolean
          notes?: string | null
          original_service_type?: string
          passengers?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          pickup_address?: string
          pickup_date?: string
          pickup_place_id?: string | null
          pickup_time?: string
          planned_stop_duration_seconds?: number
          price?: number | null
          pricing_profile_id_snapshot?: string | null
          pricing_snapshot?: Json | null
          pricing_source?: string | null
          quote_expires_at?: string | null
          quote_id?: string | null
          return_journey?: boolean
          route_legs?: Json
          scenic_template_id?: string | null
          selected_pois?: Json
          service_type?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stops_fingerprint?: string | null
          total_journey_seconds?: number | null
          tour_conversion_ack_at?: string | null
          updated_at?: string
          vehicle_capacity_snapshot?: Json | null
          vehicle_class_id?: string | null
          vehicle_class_name_snapshot?: string | null
          vehicle_id?: string | null
          vehicle_name_snapshot?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_driver_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_scenic_template_id_fkey"
            columns: ["scenic_template_id"]
            isOneToOne: false
            referencedRelation: "scenic_route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_import_jobs: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          created_rows: number
          entity: string
          error_report: Json | null
          error_rows: number
          filename: string | null
          id: string
          mode: string
          status: string
          total_rows: number
          updated_rows: number
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          created_rows?: number
          entity: string
          error_report?: Json | null
          error_rows?: number
          filename?: string | null
          id?: string
          mode?: string
          status?: string
          total_rows?: number
          updated_rows?: number
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          created_rows?: number
          entity?: string
          error_report?: Json | null
          error_rows?: number
          filename?: string | null
          id?: string
          mode?: string
          status?: string
          total_rows?: number
          updated_rows?: number
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["message_status"]
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          key: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          key: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          key?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          amount: number
          booking_id: string | null
          coupon_id: string
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          coupon_id: string
          created_at?: string
          email?: string | null
          id?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          coupon_id?: string
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          applicable_vehicle_classes: string[] | null
          applies_to_service_types: string[] | null
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          max_discount: number | null
          min_booking_amount: number | null
          notes: string | null
          per_customer_limit: number | null
          stackable: boolean
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          applicable_vehicle_classes?: string[] | null
          applies_to_service_types?: string[] | null
          code: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_booking_amount?: number | null
          notes?: string | null
          per_customer_limit?: number | null
          stackable?: boolean
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          applicable_vehicle_classes?: string[] | null
          applies_to_service_types?: string[] | null
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_booking_amount?: number | null
          notes?: string | null
          per_customer_limit?: number | null
          stackable?: boolean
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      destination_keywords: {
        Row: {
          created_at: string
          destination_id: string
          keyword_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          destination_id: string
          keyword_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          destination_id?: string
          keyword_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "destination_keywords_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_keywords_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_relationships: {
        Row: {
          created_at: string
          distance_miles: number | null
          from_id: string
          meta: Json
          rank: number
          rel_type: Database["public"]["Enums"]["destination_relationship_type"]
          to_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_miles?: number | null
          from_id: string
          meta?: Json
          rank?: number
          rel_type: Database["public"]["Enums"]["destination_relationship_type"]
          to_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_miles?: number | null
          from_id?: string
          meta?: Json
          rank?: number
          rel_type?: Database["public"]["Enums"]["destination_relationship_type"]
          to_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_relationships_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_relationships_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_search_intents: {
        Row: {
          created_at: string
          destination_id: string
          intent_id: string
          priority: number
        }
        Insert: {
          created_at?: string
          destination_id: string
          intent_id: string
          priority?: number
        }
        Update: {
          created_at?: string
          destination_id?: string
          intent_id?: string
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "destination_search_intents_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_search_intents_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_search_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_seo: {
        Row: {
          breadcrumb: Json
          canonical_url: string | null
          created_at: string
          destination_id: string
          faqs: Json
          h1: string | null
          internal_link_target_ids: string[]
          meta_description: string | null
          notes: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          schema_jsonld: Json
          seo_title: string | null
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string
        }
        Insert: {
          breadcrumb?: Json
          canonical_url?: string | null
          created_at?: string
          destination_id: string
          faqs?: Json
          h1?: string | null
          internal_link_target_ids?: string[]
          meta_description?: string | null
          notes?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          schema_jsonld?: Json
          seo_title?: string | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Update: {
          breadcrumb?: Json
          canonical_url?: string | null
          created_at?: string
          destination_id?: string
          faqs?: Json
          h1?: string | null
          internal_link_target_ids?: string[]
          meta_description?: string | null
          notes?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          schema_jsonld?: Json
          seo_title?: string | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_seo_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: true
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_tags: {
        Row: {
          created_at: string
          destination_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_tags_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          active: boolean
          council: string | null
          country: string
          created_at: string
          display_name: string | null
          id: string
          keywords: string[]
          lat: number | null
          linked_page_id: string | null
          lng: number | null
          meta: Json
          name: string
          nearby_ids: string[]
          noindex: boolean
          parent_id: string | null
          place_id: string | null
          popular_route_ids: string[]
          region: string | null
          related_service_ids: string[]
          search_vector: unknown
          seo_tier: number
          short_name: string | null
          slug: string
          synonyms: string[]
          town: string | null
          type: Database["public"]["Enums"]["destination_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          council?: string | null
          country?: string
          created_at?: string
          display_name?: string | null
          id?: string
          keywords?: string[]
          lat?: number | null
          linked_page_id?: string | null
          lng?: number | null
          meta?: Json
          name: string
          nearby_ids?: string[]
          noindex?: boolean
          parent_id?: string | null
          place_id?: string | null
          popular_route_ids?: string[]
          region?: string | null
          related_service_ids?: string[]
          search_vector?: unknown
          seo_tier?: number
          short_name?: string | null
          slug: string
          synonyms?: string[]
          town?: string | null
          type: Database["public"]["Enums"]["destination_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          council?: string | null
          country?: string
          created_at?: string
          display_name?: string | null
          id?: string
          keywords?: string[]
          lat?: number | null
          linked_page_id?: string | null
          lng?: number | null
          meta?: Json
          name?: string
          nearby_ids?: string[]
          noindex?: boolean
          parent_id?: string | null
          place_id?: string | null
          popular_route_ids?: string[]
          region?: string | null
          related_service_ids?: string[]
          search_vector?: unknown
          seo_tier?: number
          short_name?: string | null
          slug?: string
          synonyms?: string[]
          town?: string | null
          type?: Database["public"]["Enums"]["destination_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_linked_page_id_fkey"
            columns: ["linked_page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destinations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rules: {
        Row: {
          active: boolean
          basis: string
          created_at: string
          discount_type: string
          ends_at: string | null
          event_name: string | null
          id: string
          lat: number | null
          lng: number | null
          max_discount: number | null
          name: string
          notes: string | null
          place_id: string | null
          place_label: string | null
          priority: number
          radius_miles: number | null
          scope: string
          service_types: string[] | null
          stackable: boolean
          starts_at: string | null
          updated_at: string
          value: number
          vehicle_class_ids: string[] | null
        }
        Insert: {
          active?: boolean
          basis?: string
          created_at?: string
          discount_type?: string
          ends_at?: string | null
          event_name?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          max_discount?: number | null
          name: string
          notes?: string | null
          place_id?: string | null
          place_label?: string | null
          priority?: number
          radius_miles?: number | null
          scope?: string
          service_types?: string[] | null
          stackable?: boolean
          starts_at?: string | null
          updated_at?: string
          value?: number
          vehicle_class_ids?: string[] | null
        }
        Update: {
          active?: boolean
          basis?: string
          created_at?: string
          discount_type?: string
          ends_at?: string | null
          event_name?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          max_discount?: number | null
          name?: string
          notes?: string | null
          place_id?: string | null
          place_label?: string | null
          priority?: number
          radius_miles?: number | null
          scope?: string
          service_types?: string[] | null
          stackable?: boolean
          starts_at?: string | null
          updated_at?: string
          value?: number
          vehicle_class_ids?: string[] | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          address: string | null
          assigned_vehicle_id: string | null
          available: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          license_number: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_vehicle_id?: string | null
          available?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_vehicle_id?: string | null
          available?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_vehicle_classes: {
        Row: {
          created_at: string
          extra_id: string
          id: string
          price_pence: number | null
          vehicle_class_id: string
        }
        Insert: {
          created_at?: string
          extra_id: string
          id?: string
          price_pence?: number | null
          vehicle_class_id: string
        }
        Update: {
          created_at?: string
          extra_id?: string
          id?: string
          price_pence?: number | null
          vehicle_class_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_vehicle_classes_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_vehicle_classes_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      extras: {
        Row: {
          active: boolean
          applies_to_all_classes: boolean
          created_at: string
          description: string | null
          id: string
          key: string
          max_quantity: number
          name: string
          price_basis: string
          price_pence: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_all_classes?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key: string
          max_quantity?: number
          name: string
          price_basis?: string
          price_pence?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_all_classes?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          max_quantity?: number
          name?: string
          price_basis?: string
          price_pence?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      hourly_rates: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          daily_price: number | null
          display_order: number
          extra_mile_rate: number | null
          id: string
          included_hours_per_day: number | null
          included_miles_per_day: number | null
          included_miles_per_hour: number | null
          max_hours: number
          min_hours: number
          notes: string | null
          price_per_hour: number
          priority: number
          updated_at: string
          vehicle_class_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          daily_price?: number | null
          display_order?: number
          extra_mile_rate?: number | null
          id?: string
          included_hours_per_day?: number | null
          included_miles_per_day?: number | null
          included_miles_per_hour?: number | null
          max_hours?: number
          min_hours?: number
          notes?: string | null
          price_per_hour: number
          priority?: number
          updated_at?: string
          vehicle_class_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          daily_price?: number | null
          display_order?: number
          extra_mile_rate?: number | null
          id?: string
          included_hours_per_day?: number | null
          included_miles_per_day?: number | null
          included_miles_per_hour?: number | null
          max_hours?: number
          min_hours?: number
          notes?: string | null
          price_per_hour?: number
          priority?: number
          updated_at?: string
          vehicle_class_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hourly_rates_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_rates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_pricing_rules: {
        Row: {
          active: boolean
          created_at: string
          extra_per_mile: number
          id: string
          included_distance_miles: number
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          place_id: string | null
          place_label: string | null
          price: number
          price_type: string
          priority: number
          radius_miles: number
          scope: string
          updated_at: string
          vehicle_class_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          extra_per_mile?: number
          id?: string
          included_distance_miles?: number
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          place_id?: string | null
          place_label?: string | null
          price?: number
          price_type?: string
          priority?: number
          radius_miles?: number
          scope?: string
          updated_at?: string
          vehicle_class_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          extra_per_mile?: number
          id?: string
          included_distance_miles?: number
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          place_id?: string | null
          place_label?: string | null
          price?: number
          price_type?: string
          priority?: number
          radius_miles?: number
          scope?: string
          updated_at?: string
          vehicle_class_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_pricing_rules_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          attempt_count: number
          body: string | null
          booking_id: string | null
          channel: string
          created_at: string
          error: string | null
          error_category: string | null
          event_key: string | null
          id: string
          last_attempt_at: string | null
          notification_type: string | null
          payload: Json | null
          provider_message_id: string | null
          recipient: string
          recipient_category: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_key: string | null
        }
        Insert: {
          attempt_count?: number
          body?: string | null
          booking_id?: string | null
          channel: string
          created_at?: string
          error?: string | null
          error_category?: string | null
          event_key?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_type?: string | null
          payload?: Json | null
          provider_message_id?: string | null
          recipient: string
          recipient_category?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
        }
        Update: {
          attempt_count?: number
          body?: string | null
          booking_id?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          error_category?: string | null
          event_key?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_type?: string | null
          payload?: Json | null
          provider_message_id?: string | null
          recipient?: string
          recipient_category?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean
          body: string
          channel: string
          created_at: string
          id: string
          key: string
          name: string
          subject: string | null
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          active?: boolean
          body: string
          channel?: string
          created_at?: string
          id?: string
          key: string
          name: string
          subject?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          active?: boolean
          body?: string
          channel?: string
          created_at?: string
          id?: string
          key?: string
          name?: string
          subject?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      place_coords: {
        Row: {
          fetched_at: string
          lat: number
          lng: number
          place_id: string
        }
        Insert: {
          fetched_at?: string
          lat: number
          lng: number
          place_id: string
        }
        Update: {
          fetched_at?: string
          lat?: number
          lng?: number
          place_id?: string
        }
        Relationships: []
      }
      points_of_interest: {
        Row: {
          active: boolean
          address_label: string
          admin_priority: number
          admission_note: string | null
          category: string
          created_at: string
          featured: boolean
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          maximum_visit_minutes: number
          minimum_visit_minutes: number
          name: string
          opening_hours_note: string | null
          parking_fee_pence: number
          place_id: string
          recommended_visit_minutes: number
          scenic_score: number
          short_description: string
          slug: string
          stop_fee_pence: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_label?: string
          admin_priority?: number
          admission_note?: string | null
          category?: string
          created_at?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          maximum_visit_minutes?: number
          minimum_visit_minutes?: number
          name: string
          opening_hours_note?: string | null
          parking_fee_pence?: number
          place_id?: string
          recommended_visit_minutes?: number
          scenic_score?: number
          short_description?: string
          slug: string
          stop_fee_pence?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_label?: string
          admin_priority?: number
          admission_note?: string | null
          category?: string
          created_at?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          maximum_visit_minutes?: number
          minimum_visit_minutes?: number
          name?: string
          opening_hours_note?: string | null
          parking_fee_pence?: number
          place_id?: string
          recommended_visit_minutes?: number
          scenic_score?: number
          short_description?: string
          slug?: string
          stop_fee_pence?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_modifiers: {
        Row: {
          active: boolean
          created_at: string
          date_from: string | null
          date_to: string | null
          days_of_week: number[] | null
          id: string
          lat: number | null
          lng: number | null
          modifier_type: string
          name: string
          notes: string | null
          place_id: string | null
          place_label: string | null
          priority: number
          radius_miles: number | null
          scope: string
          service_types: string[] | null
          stackable: boolean
          time_from: string | null
          time_to: string | null
          updated_at: string
          value: number
          vehicle_class_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          days_of_week?: number[] | null
          id?: string
          lat?: number | null
          lng?: number | null
          modifier_type?: string
          name: string
          notes?: string | null
          place_id?: string | null
          place_label?: string | null
          priority?: number
          radius_miles?: number | null
          scope?: string
          service_types?: string[] | null
          stackable?: boolean
          time_from?: string | null
          time_to?: string | null
          updated_at?: string
          value?: number
          vehicle_class_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          days_of_week?: number[] | null
          id?: string
          lat?: number | null
          lng?: number | null
          modifier_type?: string
          name?: string
          notes?: string | null
          place_id?: string | null
          place_label?: string | null
          priority?: number
          radius_miles?: number | null
          scope?: string
          service_types?: string[] | null
          stackable?: boolean
          time_from?: string | null
          time_to?: string | null
          updated_at?: string
          value?: number
          vehicle_class_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_modifiers_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          active: boolean
          bidirectional: boolean
          created_at: string
          currency: string
          from_address: string
          from_lat: number | null
          from_lng: number | null
          from_place_id: string | null
          from_place_label: string | null
          from_radius_miles: number
          id: string
          notes: string | null
          price: number
          priority: number
          to_address: string
          to_lat: number | null
          to_lng: number | null
          to_place_id: string | null
          to_place_label: string | null
          to_radius_miles: number
          updated_at: string
          valid_for_return: boolean
          valid_from: string | null
          valid_to: string | null
          vehicle_class_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          active?: boolean
          bidirectional?: boolean
          created_at?: string
          currency?: string
          from_address: string
          from_lat?: number | null
          from_lng?: number | null
          from_place_id?: string | null
          from_place_label?: string | null
          from_radius_miles?: number
          id?: string
          notes?: string | null
          price: number
          priority?: number
          to_address: string
          to_lat?: number | null
          to_lng?: number | null
          to_place_id?: string | null
          to_place_label?: string | null
          to_radius_miles?: number
          updated_at?: string
          valid_for_return?: boolean
          valid_from?: string | null
          valid_to?: string | null
          vehicle_class_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          active?: boolean
          bidirectional?: boolean
          created_at?: string
          currency?: string
          from_address?: string
          from_lat?: number | null
          from_lng?: number | null
          from_place_id?: string | null
          from_place_label?: string | null
          from_radius_miles?: number
          id?: string
          notes?: string | null
          price?: number
          priority?: number
          to_address?: string
          to_lat?: number | null
          to_lng?: number | null
          to_place_id?: string | null
          to_place_label?: string | null
          to_radius_miles?: number
          updated_at?: string
          valid_for_return?: boolean
          valid_from?: string | null
          valid_to?: string | null
          vehicle_class_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      quote_calculations: {
        Row: {
          applied_rules: Json | null
          base_price: number
          calculation_breakdown: Json | null
          classification_reason: string | null
          created_at: string
          customer_id: string | null
          direct_distance_miles: number | null
          direct_duration_seconds: number | null
          discount_price: number
          distance_miles: number
          driving_duration_seconds: number | null
          dropoff_address: string
          dropoff_surcharge: number | null
          engine_version: string | null
          final_price: number
          final_service_type: string
          fixed_price_amount: number | null
          fixed_price_applied: boolean | null
          id: string
          mileage_price: number
          original_service_type: string
          pickup_address: string
          pickup_surcharge: number | null
          planned_stop_duration_seconds: number
          polyline_ref: string | null
          pricing_source: string | null
          profile_id: string | null
          route_legs: Json
          route_mode: string
          scenic_template_id: string | null
          selected_pois: Json
          snapshot: Json | null
          stops_fingerprint: string | null
          surcharge_price: number
          tax_price: number
          tax_rate: number | null
          time_extra: number | null
          total_journey_seconds: number | null
          vehicle_class_id: string | null
          vehicle_count: number | null
          vehicle_id: string | null
          via_price: number | null
          via_stops: number | null
        }
        Insert: {
          applied_rules?: Json | null
          base_price?: number
          calculation_breakdown?: Json | null
          classification_reason?: string | null
          created_at?: string
          customer_id?: string | null
          direct_distance_miles?: number | null
          direct_duration_seconds?: number | null
          discount_price?: number
          distance_miles: number
          driving_duration_seconds?: number | null
          dropoff_address: string
          dropoff_surcharge?: number | null
          engine_version?: string | null
          final_price?: number
          final_service_type?: string
          fixed_price_amount?: number | null
          fixed_price_applied?: boolean | null
          id?: string
          mileage_price?: number
          original_service_type?: string
          pickup_address: string
          pickup_surcharge?: number | null
          planned_stop_duration_seconds?: number
          polyline_ref?: string | null
          pricing_source?: string | null
          profile_id?: string | null
          route_legs?: Json
          route_mode?: string
          scenic_template_id?: string | null
          selected_pois?: Json
          snapshot?: Json | null
          stops_fingerprint?: string | null
          surcharge_price?: number
          tax_price?: number
          tax_rate?: number | null
          time_extra?: number | null
          total_journey_seconds?: number | null
          vehicle_class_id?: string | null
          vehicle_count?: number | null
          vehicle_id?: string | null
          via_price?: number | null
          via_stops?: number | null
        }
        Update: {
          applied_rules?: Json | null
          base_price?: number
          calculation_breakdown?: Json | null
          classification_reason?: string | null
          created_at?: string
          customer_id?: string | null
          direct_distance_miles?: number | null
          direct_duration_seconds?: number | null
          discount_price?: number
          distance_miles?: number
          driving_duration_seconds?: number | null
          dropoff_address?: string
          dropoff_surcharge?: number | null
          engine_version?: string | null
          final_price?: number
          final_service_type?: string
          fixed_price_amount?: number | null
          fixed_price_applied?: boolean | null
          id?: string
          mileage_price?: number
          original_service_type?: string
          pickup_address?: string
          pickup_surcharge?: number | null
          planned_stop_duration_seconds?: number
          polyline_ref?: string | null
          pricing_source?: string | null
          profile_id?: string | null
          route_legs?: Json
          route_mode?: string
          scenic_template_id?: string | null
          selected_pois?: Json
          snapshot?: Json | null
          stops_fingerprint?: string | null
          surcharge_price?: number
          tax_price?: number
          tax_rate?: number | null
          time_extra?: number | null
          total_journey_seconds?: number | null
          vehicle_class_id?: string | null
          vehicle_count?: number | null
          vehicle_id?: string | null
          via_price?: number | null
          via_stops?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_calculations_scenic_template_id_fkey"
            columns: ["scenic_template_id"]
            isOneToOne: false
            referencedRelation: "scenic_route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_calculations_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_calculations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_distance_cache: {
        Row: {
          cache_key: string
          created_at: string
          destination_place_id: string
          distance_meters: number
          distance_miles: number
          duration_seconds: number
          expires_at: string
          origin_place_id: string
          waypoint_place_ids: string[]
        }
        Insert: {
          cache_key: string
          created_at?: string
          destination_place_id: string
          distance_meters: number
          distance_miles: number
          duration_seconds: number
          expires_at?: string
          origin_place_id: string
          waypoint_place_ids?: string[]
        }
        Update: {
          cache_key?: string
          created_at?: string
          destination_place_id?: string
          distance_meters?: number
          distance_miles?: number
          duration_seconds?: number
          expires_at?: string
          origin_place_id?: string
          waypoint_place_ids?: string[]
        }
        Relationships: []
      }
      scenic_route_template_pois: {
        Row: {
          created_at: string
          default_selected: boolean
          id: string
          poi_id: string
          recommended: boolean
          recommended_visit_minutes: number | null
          route_template_id: string
          stop_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_selected?: boolean
          id?: string
          poi_id: string
          recommended?: boolean
          recommended_visit_minutes?: number | null
          route_template_id: string
          stop_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_selected?: boolean
          id?: string
          poi_id?: string
          recommended?: boolean
          recommended_visit_minutes?: number | null
          route_template_id?: string
          stop_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenic_route_template_pois_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "points_of_interest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenic_route_template_pois_route_template_id_fkey"
            columns: ["route_template_id"]
            isOneToOne: false
            referencedRelation: "scenic_route_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scenic_route_templates: {
        Row: {
          active: boolean
          admin_notes: string | null
          bidirectional: boolean
          created_at: string
          default_order_locked: boolean
          description: string
          destination_label: string
          destination_place_id: string
          direct_distance_miles_cache: number | null
          direct_duration_seconds_cache: number | null
          display_order: number
          excluded: Json
          featured: boolean
          hero_image_url: string | null
          id: string
          included: Json
          long_day: boolean
          name: string
          optimisation_allowed: boolean
          origin_label: string
          origin_place_id: string
          published: boolean
          recommended_start_time: string | null
          recommended_vehicle_categories: string[]
          seasonal_note: string | null
          service_type: string
          short_description: string | null
          slug: string
          starting_price_calculated_at: string | null
          starting_price_currency: string | null
          starting_price_pence_cache: number | null
          starting_price_vehicle_id: string | null
          theme: string | null
          tour_fee_pence: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          admin_notes?: string | null
          bidirectional?: boolean
          created_at?: string
          default_order_locked?: boolean
          description?: string
          destination_label?: string
          destination_place_id?: string
          direct_distance_miles_cache?: number | null
          direct_duration_seconds_cache?: number | null
          display_order?: number
          excluded?: Json
          featured?: boolean
          hero_image_url?: string | null
          id?: string
          included?: Json
          long_day?: boolean
          name: string
          optimisation_allowed?: boolean
          origin_label?: string
          origin_place_id?: string
          published?: boolean
          recommended_start_time?: string | null
          recommended_vehicle_categories?: string[]
          seasonal_note?: string | null
          service_type?: string
          short_description?: string | null
          slug: string
          starting_price_calculated_at?: string | null
          starting_price_currency?: string | null
          starting_price_pence_cache?: number | null
          starting_price_vehicle_id?: string | null
          theme?: string | null
          tour_fee_pence?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          admin_notes?: string | null
          bidirectional?: boolean
          created_at?: string
          default_order_locked?: boolean
          description?: string
          destination_label?: string
          destination_place_id?: string
          direct_distance_miles_cache?: number | null
          direct_duration_seconds_cache?: number | null
          display_order?: number
          excluded?: Json
          featured?: boolean
          hero_image_url?: string | null
          id?: string
          included?: Json
          long_day?: boolean
          name?: string
          optimisation_allowed?: boolean
          origin_label?: string
          origin_place_id?: string
          published?: boolean
          recommended_start_time?: string | null
          recommended_vehicle_categories?: string[]
          seasonal_note?: string | null
          service_type?: string
          short_description?: string | null
          slug?: string
          starting_price_calculated_at?: string | null
          starting_price_currency?: string | null
          starting_price_pence_cache?: number | null
          starting_price_vehicle_id?: string | null
          theme?: string | null
          tour_fee_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenic_route_templates_starting_price_vehicle_id_fkey"
            columns: ["starting_price_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_airports: {
        Row: {
          accessibility_notes: string | null
          created_at: string
          display_priority: number
          dropoff_guidance: string | null
          featured: boolean
          flight_tracking_available: boolean
          google_place_id: string | null
          hero_image_url: string | null
          iata_code: string | null
          icao_code: string | null
          id: string
          last_reviewed_at: string | null
          latitude: number | null
          location_id: string | null
          longitude: number | null
          meet_and_greet_details: string | null
          name: string
          operating_hours_notes: string | null
          parking_information: string | null
          pickup_instructions: string | null
          published: boolean
          slug: string
          terminal_information: string | null
          updated_at: string
          waiting_time_policy: string | null
        }
        Insert: {
          accessibility_notes?: string | null
          created_at?: string
          display_priority?: number
          dropoff_guidance?: string | null
          featured?: boolean
          flight_tracking_available?: boolean
          google_place_id?: string | null
          hero_image_url?: string | null
          iata_code?: string | null
          icao_code?: string | null
          id?: string
          last_reviewed_at?: string | null
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          meet_and_greet_details?: string | null
          name: string
          operating_hours_notes?: string | null
          parking_information?: string | null
          pickup_instructions?: string | null
          published?: boolean
          slug: string
          terminal_information?: string | null
          updated_at?: string
          waiting_time_policy?: string | null
        }
        Update: {
          accessibility_notes?: string | null
          created_at?: string
          display_priority?: number
          dropoff_guidance?: string | null
          featured?: boolean
          flight_tracking_available?: boolean
          google_place_id?: string | null
          hero_image_url?: string | null
          iata_code?: string | null
          icao_code?: string | null
          id?: string
          last_reviewed_at?: string | null
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          meet_and_greet_details?: string | null
          name?: string
          operating_hours_notes?: string | null
          parking_information?: string | null
          pickup_instructions?: string | null
          published?: boolean
          slug?: string
          terminal_information?: string | null
          updated_at?: string
          waiting_time_policy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_airports_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "seo_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_citations: {
        Row: {
          created_at: string
          directory_name: string
          id: string
          last_verified_at: string | null
          listing_url: string | null
          nap_address: string | null
          nap_name: string | null
          nap_phone: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          directory_name: string
          id?: string
          last_verified_at?: string | null
          listing_url?: string | null
          nap_address?: string | null
          nap_name?: string | null
          nap_phone?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          directory_name?: string
          id?: string
          last_verified_at?: string | null
          listing_url?: string | null
          nap_address?: string | null
          nap_name?: string | null
          nap_phone?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_locations: {
        Row: {
          admin_area_1: string | null
          admin_area_2: string | null
          country_code: string
          county: string | null
          created_at: string
          display_priority: number
          featured: boolean
          google_place_id: string | null
          id: string
          last_reviewed_at: string | null
          latitude: number | null
          location_type: Database["public"]["Enums"]["seo_location_type"]
          longitude: number | null
          name: string
          nation: string | null
          operational_status: Database["public"]["Enums"]["seo_operational_status"]
          parent_id: string | null
          postcode_area: string | null
          published: boolean
          region: string | null
          service_area_status: Database["public"]["Enums"]["seo_operational_status"]
          slug: string
          updated_at: string
        }
        Insert: {
          admin_area_1?: string | null
          admin_area_2?: string | null
          country_code?: string
          county?: string | null
          created_at?: string
          display_priority?: number
          featured?: boolean
          google_place_id?: string | null
          id?: string
          last_reviewed_at?: string | null
          latitude?: number | null
          location_type: Database["public"]["Enums"]["seo_location_type"]
          longitude?: number | null
          name: string
          nation?: string | null
          operational_status?: Database["public"]["Enums"]["seo_operational_status"]
          parent_id?: string | null
          postcode_area?: string | null
          published?: boolean
          region?: string | null
          service_area_status?: Database["public"]["Enums"]["seo_operational_status"]
          slug: string
          updated_at?: string
        }
        Update: {
          admin_area_1?: string | null
          admin_area_2?: string | null
          country_code?: string
          county?: string | null
          created_at?: string
          display_priority?: number
          featured?: boolean
          google_place_id?: string | null
          id?: string
          last_reviewed_at?: string | null
          latitude?: number | null
          location_type?: Database["public"]["Enums"]["seo_location_type"]
          longitude?: number | null
          name?: string
          nation?: string | null
          operational_status?: Database["public"]["Enums"]["seo_operational_status"]
          parent_id?: string | null
          postcode_area?: string | null
          published?: boolean
          region?: string | null
          service_area_status?: Database["public"]["Enums"]["seo_operational_status"]
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "seo_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_page_sections: {
        Row: {
          body: string | null
          created_at: string
          heading: string | null
          id: string
          last_reviewed_at: string | null
          page_id: string
          position: number
          section_type: Database["public"]["Enums"]["seo_section_type"]
          structured_payload: Json
          updated_at: string
          visible: boolean
        }
        Insert: {
          body?: string | null
          created_at?: string
          heading?: string | null
          id?: string
          last_reviewed_at?: string | null
          page_id: string
          position?: number
          section_type: Database["public"]["Enums"]["seo_section_type"]
          structured_payload?: Json
          updated_at?: string
          visible?: boolean
        }
        Update: {
          body?: string | null
          created_at?: string
          heading?: string | null
          id?: string
          last_reviewed_at?: string | null
          page_id?: string
          position?: number
          section_type?: Database["public"]["Enums"]["seo_section_type"]
          structured_payload?: Json
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "seo_page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_pages: {
        Row: {
          booking_cta_config: Json
          canonical_override: string | null
          canonical_parent_id: string | null
          created_at: string
          display_priority: number
          duplicate_score: number | null
          featured_image_url: string | null
          h1: string
          id: string
          last_reviewed_at: string | null
          meta_description: string
          og_image_url: string | null
          page_type: Database["public"]["Enums"]["seo_page_type"]
          path: string
          primary_entity_id: string
          primary_entity_type: Database["public"]["Enums"]["seo_entity_type"]
          publication_status: Database["public"]["Enums"]["seo_publication_status"]
          published_at: string | null
          quality_score: number | null
          retired_at: string | null
          reviewer_id: string | null
          robots_status: string
          secondary_entity_id: string | null
          secondary_entity_type:
            | Database["public"]["Enums"]["seo_entity_type"]
            | null
          seo_title: string
          service_id: string | null
          short_intro: string | null
          slug: string
          updated_at: string
          vehicle_category: string | null
        }
        Insert: {
          booking_cta_config?: Json
          canonical_override?: string | null
          canonical_parent_id?: string | null
          created_at?: string
          display_priority?: number
          duplicate_score?: number | null
          featured_image_url?: string | null
          h1: string
          id?: string
          last_reviewed_at?: string | null
          meta_description: string
          og_image_url?: string | null
          page_type: Database["public"]["Enums"]["seo_page_type"]
          path: string
          primary_entity_id: string
          primary_entity_type: Database["public"]["Enums"]["seo_entity_type"]
          publication_status?: Database["public"]["Enums"]["seo_publication_status"]
          published_at?: string | null
          quality_score?: number | null
          retired_at?: string | null
          reviewer_id?: string | null
          robots_status?: string
          secondary_entity_id?: string | null
          secondary_entity_type?:
            | Database["public"]["Enums"]["seo_entity_type"]
            | null
          seo_title: string
          service_id?: string | null
          short_intro?: string | null
          slug: string
          updated_at?: string
          vehicle_category?: string | null
        }
        Update: {
          booking_cta_config?: Json
          canonical_override?: string | null
          canonical_parent_id?: string | null
          created_at?: string
          display_priority?: number
          duplicate_score?: number | null
          featured_image_url?: string | null
          h1?: string
          id?: string
          last_reviewed_at?: string | null
          meta_description?: string
          og_image_url?: string | null
          page_type?: Database["public"]["Enums"]["seo_page_type"]
          path?: string
          primary_entity_id?: string
          primary_entity_type?: Database["public"]["Enums"]["seo_entity_type"]
          publication_status?: Database["public"]["Enums"]["seo_publication_status"]
          published_at?: string | null
          quality_score?: number | null
          retired_at?: string | null
          reviewer_id?: string | null
          robots_status?: string
          secondary_entity_id?: string | null
          secondary_entity_type?:
            | Database["public"]["Enums"]["seo_entity_type"]
            | null
          seo_title?: string
          service_id?: string | null
          short_intro?: string | null
          slug?: string
          updated_at?: string
          vehicle_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_pages_canonical_parent_id_fkey"
            columns: ["canonical_parent_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_pages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "seo_services"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_popular_routes: {
        Row: {
          applicable_service_ids: string[]
          applicable_vehicle_ids: string[]
          bidirectional: boolean
          created_at: string
          destination_entity_id: string
          destination_entity_type: Database["public"]["Enums"]["seo_entity_type"]
          destination_place_id: string
          direct_distance_miles_cache: number | null
          direct_duration_seconds_cache: number | null
          display_priority: number
          distance_calculated_at: string | null
          featured: boolean
          id: string
          last_reviewed_at: string | null
          operational_status: Database["public"]["Enums"]["seo_operational_status"]
          origin_entity_id: string
          origin_entity_type: Database["public"]["Enums"]["seo_entity_type"]
          origin_place_id: string
          price_calculated_at: string | null
          published: boolean
          route_notes: string | null
          seasonal_notes: string | null
          slug: string
          starting_price_pence_cache: number | null
          updated_at: string
        }
        Insert: {
          applicable_service_ids?: string[]
          applicable_vehicle_ids?: string[]
          bidirectional?: boolean
          created_at?: string
          destination_entity_id: string
          destination_entity_type: Database["public"]["Enums"]["seo_entity_type"]
          destination_place_id: string
          direct_distance_miles_cache?: number | null
          direct_duration_seconds_cache?: number | null
          display_priority?: number
          distance_calculated_at?: string | null
          featured?: boolean
          id?: string
          last_reviewed_at?: string | null
          operational_status?: Database["public"]["Enums"]["seo_operational_status"]
          origin_entity_id: string
          origin_entity_type: Database["public"]["Enums"]["seo_entity_type"]
          origin_place_id: string
          price_calculated_at?: string | null
          published?: boolean
          route_notes?: string | null
          seasonal_notes?: string | null
          slug: string
          starting_price_pence_cache?: number | null
          updated_at?: string
        }
        Update: {
          applicable_service_ids?: string[]
          applicable_vehicle_ids?: string[]
          bidirectional?: boolean
          created_at?: string
          destination_entity_id?: string
          destination_entity_type?: Database["public"]["Enums"]["seo_entity_type"]
          destination_place_id?: string
          direct_distance_miles_cache?: number | null
          direct_duration_seconds_cache?: number | null
          display_priority?: number
          distance_calculated_at?: string | null
          featured?: boolean
          id?: string
          last_reviewed_at?: string | null
          operational_status?: Database["public"]["Enums"]["seo_operational_status"]
          origin_entity_id?: string
          origin_entity_type?: Database["public"]["Enums"]["seo_entity_type"]
          origin_place_id?: string
          price_calculated_at?: string | null
          published?: boolean
          route_notes?: string | null
          seasonal_notes?: string | null
          slug?: string
          starting_price_pence_cache?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_publication_issues: {
        Row: {
          created_at: string
          id: string
          issue_type: string
          message: string
          page_id: string | null
          payload: Json | null
          resolved: boolean
          resolved_at: string | null
          severity: Database["public"]["Enums"]["seo_issue_severity"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_type: string
          message: string
          page_id?: string | null
          payload?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["seo_issue_severity"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_type?: string
          message?: string
          page_id?: string | null
          payload?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["seo_issue_severity"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_publication_issues_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_redirects: {
        Row: {
          active: boolean
          created_at: string
          from_path: string
          hit_count: number
          id: string
          last_hit_at: string | null
          notes: string | null
          status_code: Database["public"]["Enums"]["seo_redirect_code"]
          to_path: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          from_path: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          notes?: string | null
          status_code?: Database["public"]["Enums"]["seo_redirect_code"]
          to_path: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          from_path?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          notes?: string | null
          status_code?: Database["public"]["Enums"]["seo_redirect_code"]
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_review_requests: {
        Row: {
          booking_id: string | null
          completed_at: string | null
          created_at: string
          customer_email: string | null
          eligible: boolean
          id: string
          notes: string | null
          platform: string | null
          requested_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string | null
          eligible?: boolean
          id?: string
          notes?: string | null
          platform?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string | null
          eligible?: boolean
          id?: string
          notes?: string | null
          platform?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_review_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_search_console_snapshots: {
        Row: {
          average_position: number | null
          clicks: number
          created_at: string
          ctr: number | null
          id: string
          impressions: number
          page_path: string
          raw_payload: Json | null
          snapshot_date: string
        }
        Insert: {
          average_position?: number | null
          clicks?: number
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number
          page_path: string
          raw_payload?: Json | null
          snapshot_date: string
        }
        Update: {
          average_position?: number | null
          clicks?: number
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number
          page_path?: string
          raw_payload?: Json | null
          snapshot_date?: string
        }
        Relationships: []
      }
      seo_services: {
        Row: {
          created_at: string
          display_priority: number
          eligibility: string | null
          features: Json
          fleet_categories: string[]
          full_description: string | null
          hero_image_url: string | null
          id: string
          legacy_route_path: string | null
          name: string
          published: boolean
          short_description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_priority?: number
          eligibility?: string | null
          features?: Json
          fleet_categories?: string[]
          full_description?: string | null
          hero_image_url?: string | null
          id?: string
          legacy_route_path?: string | null
          name: string
          published?: boolean
          short_description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_priority?: number
          eligibility?: string | null
          features?: Json
          fleet_categories?: string[]
          full_description?: string | null
          hero_image_url?: string | null
          id?: string
          legacy_route_path?: string | null
          name?: string
          published?: boolean
          short_description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_credentials: {
        Row: {
          google_maps_api_key: string | null
          id: number
          smtp_host: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string
        }
        Insert: {
          google_maps_api_key?: string | null
          id?: number
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
        }
        Update: {
          google_maps_api_key?: string | null
          id?: number
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          allowed_stop_duration_minutes: number[]
          business_address: string | null
          cancellation_policy: string | null
          child_seat_fee_pence: number
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          currency: string
          currency_symbol: string
          default_booking_status: Database["public"]["Enums"]["booking_status"]
          favicon_url: string | null
          id: number
          included_stop_minutes: number
          logo_url: string | null
          maintenance_mode: boolean
          max_detour_miles: number
          max_detour_minutes: number
          max_poi_suggestions: number
          max_selected_stops: number
          meet_greet_fee_pence: number
          payment_mode: string
          poi_corridor_enabled: boolean
          poi_corridor_max_pois: number
          poi_corridor_radius_miles: number
          poi_discovery_enabled: boolean
          policy_flexible_min_pence: number
          policy_flexible_percent: number
          policy_non_refundable_min_pence: number
          policy_non_refundable_percent: number
          price_per_extra_15min_pence: number
          primary_color: string
          return_journey_fee_pence: number
          sightseeing_threshold_minutes: number
          tax_effective_from: string | null
          tax_enabled: boolean
          tax_label: string
          tax_mode: string
          tax_percentage: number
          timezone: string
          tour_conversion_wording: string
          tour_threshold_minutes: number
          tour_threshold_stops: number
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          allowed_stop_duration_minutes?: number[]
          business_address?: string | null
          cancellation_policy?: string | null
          child_seat_fee_pence?: number
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          currency_symbol?: string
          default_booking_status?: Database["public"]["Enums"]["booking_status"]
          favicon_url?: string | null
          id?: number
          included_stop_minutes?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          max_detour_miles?: number
          max_detour_minutes?: number
          max_poi_suggestions?: number
          max_selected_stops?: number
          meet_greet_fee_pence?: number
          payment_mode?: string
          poi_corridor_enabled?: boolean
          poi_corridor_max_pois?: number
          poi_corridor_radius_miles?: number
          poi_discovery_enabled?: boolean
          policy_flexible_min_pence?: number
          policy_flexible_percent?: number
          policy_non_refundable_min_pence?: number
          policy_non_refundable_percent?: number
          price_per_extra_15min_pence?: number
          primary_color?: string
          return_journey_fee_pence?: number
          sightseeing_threshold_minutes?: number
          tax_effective_from?: string | null
          tax_enabled?: boolean
          tax_label?: string
          tax_mode?: string
          tax_percentage?: number
          timezone?: string
          tour_conversion_wording?: string
          tour_threshold_minutes?: number
          tour_threshold_stops?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          allowed_stop_duration_minutes?: number[]
          business_address?: string | null
          cancellation_policy?: string | null
          child_seat_fee_pence?: number
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          currency_symbol?: string
          default_booking_status?: Database["public"]["Enums"]["booking_status"]
          favicon_url?: string | null
          id?: number
          included_stop_minutes?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          max_detour_miles?: number
          max_detour_minutes?: number
          max_poi_suggestions?: number
          max_selected_stops?: number
          meet_greet_fee_pence?: number
          payment_mode?: string
          poi_corridor_enabled?: boolean
          poi_corridor_max_pois?: number
          poi_corridor_radius_miles?: number
          poi_discovery_enabled?: boolean
          policy_flexible_min_pence?: number
          policy_flexible_percent?: number
          policy_non_refundable_min_pence?: number
          policy_non_refundable_percent?: number
          price_per_extra_15min_pence?: number
          primary_color?: string
          return_journey_fee_pence?: number
          sightseeing_threshold_minutes?: number
          tax_effective_from?: string | null
          tax_enabled?: boolean
          tax_label?: string
          tax_mode?: string
          tax_percentage?: number
          timezone?: string
          tour_conversion_wording?: string
          tour_threshold_minutes?: number
          tour_threshold_stops?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      surcharges: {
        Row: {
          active: boolean
          amount: number
          applies_to: string
          charge_type: string
          created_at: string
          days_of_week: number[] | null
          ends_at: string | null
          id: string
          name: string
          notes: string | null
          priority: number
          starts_at: string | null
          time_from: string | null
          time_to: string | null
          updated_at: string
          vehicle_class_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          active?: boolean
          amount: number
          applies_to?: string
          charge_type?: string
          created_at?: string
          days_of_week?: number[] | null
          ends_at?: string | null
          id?: string
          name: string
          notes?: string | null
          priority?: number
          starts_at?: string | null
          time_from?: string | null
          time_to?: string | null
          updated_at?: string
          vehicle_class_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          applies_to?: string
          charge_type?: string
          created_at?: string
          days_of_week?: number[] | null
          ends_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          priority?: number
          starts_at?: string | null
          time_from?: string | null
          time_to?: string | null
          updated_at?: string
          vehicle_class_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surcharges_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surcharges_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_keywords: {
        Row: {
          category: string | null
          created_at: string
          id: string
          keyword: string
          normalized: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          keyword: string
          normalized?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          keyword?: string
          normalized?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      taxonomy_search_intents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          intent: string
          normalized: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          intent: string
          normalized?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          intent?: string
          normalized?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      taxonomy_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          normalized: string | null
          tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          normalized?: string | null
          tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          normalized?: string | null
          tag?: string
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
      vehicle_classes: {
        Row: {
          active: boolean
          badge: string | null
          cabin_bags: number
          child_seats_supported: boolean
          created_at: string
          display_order: number
          featured: boolean
          fuel_type: string
          gallery: Json
          hand_luggage: number
          hero_image: string | null
          id: string
          large_luggage: number
          long_description: string | null
          name: string
          passengers: number
          pricing_vehicle_id: string | null
          quote_on_request: boolean
          recommended_for: Json
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          updated_at: string
          wheelchair_accessible: boolean
        }
        Insert: {
          active?: boolean
          badge?: string | null
          cabin_bags?: number
          child_seats_supported?: boolean
          created_at?: string
          display_order?: number
          featured?: boolean
          fuel_type?: string
          gallery?: Json
          hand_luggage?: number
          hero_image?: string | null
          id?: string
          large_luggage?: number
          long_description?: string | null
          name: string
          passengers?: number
          pricing_vehicle_id?: string | null
          quote_on_request?: boolean
          recommended_for?: Json
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          updated_at?: string
          wheelchair_accessible?: boolean
        }
        Update: {
          active?: boolean
          badge?: string | null
          cabin_bags?: number
          child_seats_supported?: boolean
          created_at?: string
          display_order?: number
          featured?: boolean
          fuel_type?: string
          gallery?: Json
          hand_luggage?: number
          hero_image?: string | null
          id?: string
          large_luggage?: number
          long_description?: string | null
          name?: string
          passengers?: number
          pricing_vehicle_id?: string | null
          quote_on_request?: boolean
          recommended_for?: Json
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          updated_at?: string
          wheelchair_accessible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_classes_pricing_vehicle_id_fkey"
            columns: ["pricing_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_mileage_tiers: {
        Row: {
          cost_per_mile: number
          created_at: string
          id: string
          miles: number
          pricing_profile_id: string
          sort_order: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          cost_per_mile: number
          created_at?: string
          id?: string
          miles: number
          pricing_profile_id: string
          sort_order?: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          cost_per_mile?: number
          created_at?: string
          id?: string
          miles?: number
          pricing_profile_id?: string
          sort_order?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_tiers_pricing_profile_id_fkey"
            columns: ["pricing_profile_id"]
            isOneToOne: false
            referencedRelation: "vehicle_pricing_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_models: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          manufacturer: string | null
          name: string
          notes: string | null
          updated_at: string
          vehicle_class_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          manufacturer?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          vehicle_class_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          manufacturer?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          vehicle_class_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_pricing_profiles: {
        Row: {
          airport_pickup_fee: number
          base_price: number
          city_included_miles: number
          connecting_job_discount_percent: number
          created_at: string
          id: string
          status: boolean
          time_extra_amount: number
          time_extra_from: string | null
          time_extra_to: string | null
          time_extra_type: string
          updated_at: string
          vehicle_add_price_enabled: boolean
          vehicle_class_id: string | null
          vehicle_id: string
          via_price: number
          waiting_fee_per_minute: number
        }
        Insert: {
          airport_pickup_fee?: number
          base_price?: number
          city_included_miles?: number
          connecting_job_discount_percent?: number
          created_at?: string
          id?: string
          status?: boolean
          time_extra_amount?: number
          time_extra_from?: string | null
          time_extra_to?: string | null
          time_extra_type?: string
          updated_at?: string
          vehicle_add_price_enabled?: boolean
          vehicle_class_id?: string | null
          vehicle_id: string
          via_price?: number
          waiting_fee_per_minute?: number
        }
        Update: {
          airport_pickup_fee?: number
          base_price?: number
          city_included_miles?: number
          connecting_job_discount_percent?: number
          created_at?: string
          id?: string
          status?: boolean
          time_extra_amount?: number
          time_extra_from?: string | null
          time_extra_to?: string | null
          time_extra_type?: string
          updated_at?: string
          vehicle_add_price_enabled?: boolean
          vehicle_class_id?: string | null
          vehicle_id?: string
          via_price?: number
          waiting_fee_per_minute?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_pricing_profiles_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicle_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_pricing_profiles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          base_fare: number | null
          category: string
          created_at: string
          description: string
          display_order: number
          featured: boolean
          features: Json
          hand_luggage: number
          id: string
          image_url: string
          luggage: number
          meet_greet_enabled: boolean
          name: string
          needs_review: boolean
          passengers: number
          per_mile_rate: number | null
          price_per_hour: number | null
          short_description: string | null
          slug: string | null
          tbms_id: string | null
          updated_at: string
          vehicle_class: Database["public"]["Enums"]["vehicle_class"] | null
          waiting_charge: number | null
        }
        Insert: {
          active?: boolean
          base_fare?: number | null
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          featured?: boolean
          features?: Json
          hand_luggage?: number
          id?: string
          image_url: string
          luggage?: number
          meet_greet_enabled?: boolean
          name: string
          needs_review?: boolean
          passengers?: number
          per_mile_rate?: number | null
          price_per_hour?: number | null
          short_description?: string | null
          slug?: string | null
          tbms_id?: string | null
          updated_at?: string
          vehicle_class?: Database["public"]["Enums"]["vehicle_class"] | null
          waiting_charge?: number | null
        }
        Update: {
          active?: boolean
          base_fare?: number | null
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          featured?: boolean
          features?: Json
          hand_luggage?: number
          id?: string
          image_url?: string
          luggage?: number
          meet_greet_enabled?: boolean
          name?: string
          needs_review?: boolean
          passengers?: number
          per_mile_rate?: number | null
          price_per_hour?: number | null
          short_description?: string | null
          slug?: string | null
          tbms_id?: string | null
          updated_at?: string
          vehicle_class?: Database["public"]["Enums"]["vehicle_class"] | null
          waiting_charge?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_ref: { Args: never; Returns: string }
      get_booking_by_confirmation_hash: {
        Args: { _hash: string }
        Returns: {
          booking_ref: string
          child_seat: boolean
          created_at: string
          customer_name: string
          distance_miles: number
          dropoff_address: string
          email: string
          flight_number: string
          luggage: number
          meet_greet: boolean
          notes: string
          passengers: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          pickup_address: string
          pickup_date: string
          pickup_time: string
          price: number
          return_journey: boolean
          status: Database["public"]["Enums"]["booking_status"]
          vehicle_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_bookable_destinations: {
        Args: { _limit?: number; _q: string }
        Returns: {
          council: string
          id: string
          lat: number
          lng: number
          name: string
          place_id: string
          region: string
          seo_tier: number
          slug: string
          town: string
          type: Database["public"]["Enums"]["destination_type"]
        }[]
      }
      seo_find_orphan_pages: {
        Args: never
        Returns: {
          page_id: string
          path: string
          seo_title: string
        }[]
      }
      seo_find_similar_pages: {
        Args: { _threshold?: number }
        Returns: {
          a_id: string
          a_path: string
          b_id: string
          b_path: string
          meta_sim: number
          title_sim: number
        }[]
      }
      set_booking_status: {
        Args: {
          _actor_id: string
          _booking_id: string
          _new_status: Database["public"]["Enums"]["booking_status"]
          _override?: boolean
          _reason?: string
        }
        Returns: {
          changed: boolean
          id: string
          previous_status: Database["public"]["Enums"]["booking_status"]
          status: Database["public"]["Enums"]["booking_status"]
          transition_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      blog_post_status:
        | "draft"
        | "review"
        | "scheduled"
        | "published"
        | "archived"
      booking_status:
        | "new"
        | "confirmed"
        | "assigned"
        | "on_way"
        | "completed"
        | "cancelled"
        | "pending_allocation"
        | "in_progress"
        | "bidding"
        | "awaiting_payment"
        | "driver_en_route"
        | "passenger_on_board"
        | "rejected"
      destination_relationship_type:
        | "nearby"
        | "serves"
        | "belongs_to"
        | "popular_route"
        | "nearest_airport"
        | "nearest_station"
        | "nearest_hospital"
        | "nearest_university"
        | "related_service"
        | "related_attraction"
        | "related_hotel"
        | "related_business_park"
      destination_type:
        | "location"
        | "route"
        | "airport"
        | "station"
        | "cruise_port"
        | "university"
        | "hospital"
        | "corporate"
        | "attraction"
        | "distillery"
        | "business_park"
        | "service"
        | "guide"
        | "region"
        | "council"
        | "country"
        | "city"
        | "town"
        | "village"
        | "college"
        | "castle"
        | "museum"
        | "golf_course"
        | "hotel"
        | "brewery"
        | "wedding_venue"
        | "event_venue"
        | "car_rental"
        | "campervan_rental"
        | "ferry_terminal"
        | "bus_station"
        | "tour_category"
        | "blog"
      discount_type: "fixed" | "percentage"
      driver_status: "active" | "inactive" | "suspended"
      message_status: "new" | "read" | "resolved"
      payment_status: "unpaid" | "paid" | "refunded" | "partial" | "failed"
      seo_entity_type:
        | "location"
        | "airport"
        | "tour"
        | "port"
        | "train_station"
        | "service"
        | "fleet_category"
      seo_issue_severity: "info" | "warning" | "error" | "blocker"
      seo_location_type:
        | "country"
        | "nation"
        | "region"
        | "county"
        | "city"
        | "town"
        | "district"
      seo_operational_status: "active" | "partner" | "planned" | "not_serviced"
      seo_page_type:
        | "regional_hub"
        | "location_hub"
        | "location_service"
        | "airport_hub"
        | "airport_transfer"
        | "airport_route"
        | "city_to_city_route"
        | "service"
        | "fleet_category"
        | "tour"
        | "local_guide"
      seo_publication_status:
        | "draft"
        | "needs_content"
        | "needs_review"
        | "approved"
        | "published"
        | "noindex"
        | "retired"
      seo_redirect_code: "301" | "308"
      seo_section_type:
        | "hero"
        | "intro"
        | "service_overview"
        | "local_travel_info"
        | "airport_pickup_instructions"
        | "route_overview"
        | "route_facts"
        | "fleet_recommendations"
        | "popular_destinations"
        | "nearby_airports"
        | "nearby_cities"
        | "relevant_services"
        | "relevant_tours"
        | "booking_cta"
        | "faqs"
        | "local_landmarks"
        | "corporate_travel_info"
        | "accessibility"
        | "custom_rich_text"
      vehicle_class:
        | "economy"
        | "business"
        | "first"
        | "executive_v"
        | "executive_van_8"
        | "green"
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
      app_role: ["admin", "user"],
      blog_post_status: [
        "draft",
        "review",
        "scheduled",
        "published",
        "archived",
      ],
      booking_status: [
        "new",
        "confirmed",
        "assigned",
        "on_way",
        "completed",
        "cancelled",
        "pending_allocation",
        "in_progress",
        "bidding",
        "awaiting_payment",
        "driver_en_route",
        "passenger_on_board",
        "rejected",
      ],
      destination_relationship_type: [
        "nearby",
        "serves",
        "belongs_to",
        "popular_route",
        "nearest_airport",
        "nearest_station",
        "nearest_hospital",
        "nearest_university",
        "related_service",
        "related_attraction",
        "related_hotel",
        "related_business_park",
      ],
      destination_type: [
        "location",
        "route",
        "airport",
        "station",
        "cruise_port",
        "university",
        "hospital",
        "corporate",
        "attraction",
        "distillery",
        "business_park",
        "service",
        "guide",
        "region",
        "council",
        "country",
        "city",
        "town",
        "village",
        "college",
        "castle",
        "museum",
        "golf_course",
        "hotel",
        "brewery",
        "wedding_venue",
        "event_venue",
        "car_rental",
        "campervan_rental",
        "ferry_terminal",
        "bus_station",
        "tour_category",
        "blog",
      ],
      discount_type: ["fixed", "percentage"],
      driver_status: ["active", "inactive", "suspended"],
      message_status: ["new", "read", "resolved"],
      payment_status: ["unpaid", "paid", "refunded", "partial", "failed"],
      seo_entity_type: [
        "location",
        "airport",
        "tour",
        "port",
        "train_station",
        "service",
        "fleet_category",
      ],
      seo_issue_severity: ["info", "warning", "error", "blocker"],
      seo_location_type: [
        "country",
        "nation",
        "region",
        "county",
        "city",
        "town",
        "district",
      ],
      seo_operational_status: ["active", "partner", "planned", "not_serviced"],
      seo_page_type: [
        "regional_hub",
        "location_hub",
        "location_service",
        "airport_hub",
        "airport_transfer",
        "airport_route",
        "city_to_city_route",
        "service",
        "fleet_category",
        "tour",
        "local_guide",
      ],
      seo_publication_status: [
        "draft",
        "needs_content",
        "needs_review",
        "approved",
        "published",
        "noindex",
        "retired",
      ],
      seo_redirect_code: ["301", "308"],
      seo_section_type: [
        "hero",
        "intro",
        "service_overview",
        "local_travel_info",
        "airport_pickup_instructions",
        "route_overview",
        "route_facts",
        "fleet_recommendations",
        "popular_destinations",
        "nearby_airports",
        "nearby_cities",
        "relevant_services",
        "relevant_tours",
        "booking_cta",
        "faqs",
        "local_landmarks",
        "corporate_travel_info",
        "accessibility",
        "custom_rich_text",
      ],
      vehicle_class: [
        "economy",
        "business",
        "first",
        "executive_v",
        "executive_van_8",
        "green",
      ],
    },
  },
} as const

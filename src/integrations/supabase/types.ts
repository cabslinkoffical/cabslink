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
      addresses: {
        Row: {
          active: boolean
          comparable_value: string | null
          created_at: string
          dropoff_charge: number
          id: string
          name: string
          notes: string | null
          pickup_charge: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          comparable_value?: string | null
          created_at?: string
          dropoff_charge?: number
          id?: string
          name: string
          notes?: string | null
          pickup_charge?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          comparable_value?: string | null
          created_at?: string
          dropoff_charge?: number
          id?: string
          name?: string
          notes?: string | null
          pickup_charge?: number
          updated_at?: string
        }
        Relationships: []
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
      bookings: {
        Row: {
          admin_notes: string | null
          assigned_at: string | null
          booking_ref: string | null
          child_seat: boolean
          created_at: string
          customer_name: string
          deleted_at: string | null
          driver_id: string | null
          dropoff_address: string
          email: string
          flight_number: string | null
          id: string
          luggage: number
          meet_greet: boolean
          notes: string | null
          passengers: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          pickup_address: string
          pickup_date: string
          pickup_time: string
          price: number | null
          return_journey: boolean
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_at?: string | null
          booking_ref?: string | null
          child_seat?: boolean
          created_at?: string
          customer_name: string
          deleted_at?: string | null
          driver_id?: string | null
          dropoff_address: string
          email: string
          flight_number?: string | null
          id?: string
          luggage?: number
          meet_greet?: boolean
          notes?: string | null
          passengers?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          pickup_address: string
          pickup_date: string
          pickup_time: string
          price?: number | null
          return_journey?: boolean
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          admin_notes?: string | null
          assigned_at?: string | null
          booking_ref?: string | null
          child_seat?: boolean
          created_at?: string
          customer_name?: string
          deleted_at?: string | null
          driver_id?: string | null
          dropoff_address?: string
          email?: string
          flight_number?: string | null
          id?: string
          luggage?: number
          meet_greet?: boolean
          notes?: string | null
          passengers?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          pickup_address?: string
          pickup_date?: string
          pickup_time?: string
          price?: number | null
          return_journey?: boolean
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
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
        ]
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
      coupons: {
        Row: {
          active: boolean
          applicable_vehicle_classes: string[] | null
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          min_booking_amount: number | null
          notes: string | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          applicable_vehicle_classes?: string[] | null
          code: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          min_booking_amount?: number | null
          notes?: string | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          applicable_vehicle_classes?: string[] | null
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          min_booking_amount?: number | null
          notes?: string | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
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
      site_settings: {
        Row: {
          business_address: string | null
          cancellation_policy: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          currency: string
          default_booking_status: Database["public"]["Enums"]["booking_status"]
          favicon_url: string | null
          google_maps_api_key: string | null
          id: number
          logo_url: string | null
          maintenance_mode: boolean
          primary_color: string
          smtp_host: string | null
          smtp_port: number | null
          smtp_user: string | null
          tax_percentage: number
          timezone: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          business_address?: string | null
          cancellation_policy?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          default_booking_status?: Database["public"]["Enums"]["booking_status"]
          favicon_url?: string | null
          google_maps_api_key?: string | null
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          primary_color?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          tax_percentage?: number
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          business_address?: string | null
          cancellation_policy?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          default_booking_status?: Database["public"]["Enums"]["booking_status"]
          favicon_url?: string | null
          google_maps_api_key?: string | null
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          primary_color?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          tax_percentage?: number
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
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
      vehicles: {
        Row: {
          active: boolean
          base_fare: number | null
          category: string
          created_at: string
          description: string
          display_order: number
          featured: boolean
          hand_luggage: number
          id: string
          image_url: string
          luggage: number
          meet_greet_enabled: boolean
          name: string
          passengers: number
          per_mile_rate: number | null
          price_per_hour: number | null
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
          hand_luggage?: number
          id?: string
          image_url: string
          luggage?: number
          meet_greet_enabled?: boolean
          name: string
          passengers?: number
          per_mile_rate?: number | null
          price_per_hour?: number | null
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
          hand_luggage?: number
          id?: string
          image_url?: string
          luggage?: number
          meet_greet_enabled?: boolean
          name?: string
          passengers?: number
          per_mile_rate?: number | null
          price_per_hour?: number | null
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
      discount_type: "fixed" | "percentage"
      driver_status: "active" | "inactive" | "suspended"
      message_status: "new" | "read" | "resolved"
      payment_status: "unpaid" | "paid" | "refunded" | "partial" | "failed"
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
      ],
      discount_type: ["fixed", "percentage"],
      driver_status: ["active", "inactive", "suspended"],
      message_status: ["new", "read", "resolved"],
      payment_status: ["unpaid", "paid", "refunded", "partial", "failed"],
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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "admin" | "sales";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "admin" | "sales";
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          role?: "admin" | "sales";
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string;
          location: string | null;
          budget: number;
          interest_type: string;
          lead_tag: "hot" | "warm" | "cold";
          sales_rep_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email: string;
          location?: string | null;
          budget?: number;
          interest_type: string;
          lead_tag?: "hot" | "warm" | "cold";
          sales_rep_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          phone?: string;
          email?: string;
          location?: string | null;
          budget?: number;
          interest_type?: string;
          lead_tag?: "hot" | "warm" | "cold";
          sales_rep_id?: string | null;
          updated_at?: string;
        };
      };
      interactions: {
        Row: {
          id: string;
          customer_id: string;
          kind: "call" | "whatsapp" | "meeting";
          note: string | null;
          responded_in_minutes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          kind: "call" | "whatsapp" | "meeting";
          note?: string | null;
          responded_in_minutes?: number | null;
          created_at?: string;
        };
        Update: {
          note?: string | null;
          responded_in_minutes?: number | null;
        };
      };
      deals: {
        Row: {
          id: string;
          customer_id: string;
          stage: "lead" | "contacted" | "negotiation" | "closed";
          engagement_level: number;
          value: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          stage: "lead" | "contacted" | "negotiation" | "closed";
          engagement_level?: number;
          value?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stage?: "lead" | "contacted" | "negotiation" | "closed";
          engagement_level?: number;
          value?: number;
          updated_at?: string;
        };
      };
      ai_insights: {
        Row: {
          id: string;
          customer_id: string;
          likelihood_score: number;
          intent_class: "High intent" | "Medium intent" | "Low intent";
          best_contact_time: string;
          recommended_offer: string;
          model_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          likelihood_score: number;
          intent_class: "High intent" | "Medium intent" | "Low intent";
          best_contact_time: string;
          recommended_offer: string;
          model_version?: string;
          created_at?: string;
        };
        Update: {
          likelihood_score?: number;
          intent_class?: "High intent" | "Medium intent" | "Low intent";
          best_contact_time?: string;
          recommended_offer?: string;
        };
      };
      follow_ups: {
        Row: {
          id: string;
          customer_id: string;
          due_at: string;
          reminder_text: string;
          status: "pending" | "done" | "snoozed" | "cancelled";
          snoozed_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          due_at: string;
          reminder_text: string;
          status?: "pending" | "done" | "snoozed" | "cancelled";
          snoozed_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          due_at?: string;
          reminder_text?: string;
          status?: "pending" | "done" | "snoozed" | "cancelled";
          snoozed_until?: string | null;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          customer_id: string | null;
          follow_up_id: string | null;
          channel: "in_app" | "push";
          title: string;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          follow_up_id?: string | null;
          channel?: "in_app" | "push";
          title: string;
          body: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

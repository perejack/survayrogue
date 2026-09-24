import { createClient } from '@supabase/supabase-js';

// SurveyKe Supabase - Original working database
const supabaseUrl = 'https://jhzpromgrkwqaotzihvx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoenByb21ncmt3cWFvdHppaHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODIwNTAsImV4cCI6MjA5MTk1ODA1MH0.OW5HeOzk53Vm91UuUTsYsoQbNOHOo0w44u5h2rb-TMY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
    },
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          email: string;
          phone: string;
          balance: number;
          total_earned: number;
          surveys_completed: number;
          is_premium: boolean;
          premium_tier: string | null;
          is_active: boolean;
          avatar: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          phone: string;
          balance?: number;
          total_earned?: number;
          surveys_completed?: number;
          is_premium?: boolean;
          premium_tier?: string | null;
          is_active?: boolean;
          avatar?: string;
        };
        Update: {
          name?: string;
          email?: string;
          phone?: string;
          balance?: number;
          total_earned?: number;
          surveys_completed?: number;
          is_premium?: boolean;
          premium_tier?: string | null;
          is_active?: boolean;
          avatar?: string;
        };
      };
      surveys: {
        Row: {
          id: string;
          created_at: string;
          question: string;
          options: string[];
          reward: number;
          category: string;
          is_active: boolean;
          order_index: number;
        };
        Insert: {
          question: string;
          options: string[];
          reward: number;
          category: string;
          is_active?: boolean;
          order_index?: number;
        };
        Update: {
          question?: string;
          options?: string[];
          reward?: number;
          category?: string;
          is_active?: boolean;
          order_index?: number;
        };
      };
      categories: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          description: string;
          reward: number;
          unlock_fee: number | null;
          is_free: boolean;
          image_url: string;
          gradient: string;
          text_color: string;
          surveys_count: number;
        };
        Insert: {
          name: string;
          description: string;
          reward: number;
          unlock_fee?: number | null;
          is_free?: boolean;
          image_url?: string;
          gradient?: string;
          text_color?: string;
          surveys_count?: number;
        };
        Update: {
          name?: string;
          description?: string;
          reward?: number;
          unlock_fee?: number | null;
          is_free?: boolean;
          image_url?: string;
          gradient?: string;
          text_color?: string;
          surveys_count?: number;
        };
      };
      user_surveys: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          survey_id: string;
          category_id: string;
          completed: boolean;
          earned: number;
        };
        Insert: {
          user_id: string;
          survey_id: string;
          category_id: string;
          completed?: boolean;
          earned?: number;
        };
        Update: {
          completed?: boolean;
          earned?: number;
        };
      };
      unlocked_categories: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          category_id: string;
          unlocked_at: string;
        };
        Insert: {
          user_id: string;
          category_id: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          type: 'earned' | 'withdrawal' | 'unlock' | 'upgrade';
          description: string;
          amount: number;
          status: 'pending' | 'completed' | 'failed';
          mpesa_ref: string | null;
        };
        Insert: {
          user_id: string;
          type: 'earned' | 'withdrawal' | 'unlock' | 'upgrade';
          description: string;
          amount: number;
          status?: 'pending' | 'completed' | 'failed';
          mpesa_ref?: string | null;
        };
        Update: {
          status?: 'pending' | 'completed' | 'failed';
          mpesa_ref?: string | null;
        };
      };
      premium_packages: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          price: number;
          features: string[];
          daily_surveys: number;
          reward_multiplier: number;
          color: string;
          is_popular: boolean;
        };
        Insert: {
          name: string;
          price: number;
          features: string[];
          daily_surveys: number;
          reward_multiplier: number;
          color?: string;
          is_popular?: boolean;
        };
        Update: {
          name?: string;
          price?: number;
          features?: string[];
          daily_surveys?: number;
          reward_multiplier?: number;
          color?: string;
          is_popular?: boolean;
        };
      };
      mpesa_payments: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          phone_number: string;
          amount: number;
          type: 'activation' | 'unlock' | 'upgrade' | 'withdrawal';
          reference_id: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          mpesa_receipt: string | null;
          checkout_request_id: string | null;
        };
        Insert: {
          user_id: string;
          phone_number: string;
          amount: number;
          type: 'activation' | 'unlock' | 'upgrade' | 'withdrawal';
          reference_id: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          mpesa_receipt?: string | null;
          checkout_request_id?: string | null;
        };
        Update: {
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          mpesa_receipt?: string | null;
          checkout_request_id?: string | null;
        };
      };
    };
  };
};

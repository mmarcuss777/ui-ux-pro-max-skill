// Database types matching supabase/migrations/0001_init.sql.
// Regenerate after schema changes with:
//   npx supabase gen types typescript --project-id <project-id> > types/db.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          business_type: string
          active_modules: string[]
          status: string
          is_primary: boolean
          goals: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          business_type?: string
          active_modules?: string[]
          status?: string
          is_primary?: boolean
          goals?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          business_type?: string
          active_modules?: string[]
          status?: string
          is_primary?: boolean
          goals?: string | null
          created_at?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          date: string
          type: string
          score: number | null
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id?: string | null
          date?: string
          type: string
          score?: number | null
          data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string | null
          date?: string
          type?: string
          score?: number | null
          data?: Json
          created_at?: string
        }
        Relationships: []
      }
      experiments: {
        Row: {
          id: string
          workspace_id: string
          status: string
          hypothesis: string
          metric: string | null
          test_method: string | null
          deadline: string | null
          result: string | null
          decision: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          status?: string
          hypothesis: string
          metric?: string | null
          test_method?: string | null
          deadline?: string | null
          result?: string | null
          decision?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          status?: string
          hypothesis?: string
          metric?: string | null
          test_method?: string | null
          deadline?: string | null
          result?: string | null
          decision?: string | null
          created_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          workspace_id: string
          type: string
          name: string
          cost: number | null
          price: number | null
          margin: number | null
          status: string
          audience: string | null
          problem: string | null
          why_buy: string | null
          created_at: string
        }
        Insert: {
          // margin is a generated column — never written by the app
          id?: string
          workspace_id: string
          type: string
          name: string
          cost?: number | null
          price?: number | null
          status?: string
          audience?: string | null
          problem?: string | null
          why_buy?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          type?: string
          name?: string
          cost?: number | null
          price?: number | null
          status?: string
          audience?: string | null
          problem?: string | null
          why_buy?: string | null
          created_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          workspace_id: string
          contact_type: string
          name: string
          contact: string | null
          stage: string | null
          next_step: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_type: string
          name: string
          contact?: string | null
          stage?: string | null
          next_step?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_type?: string
          name?: string
          contact?: string | null
          stage?: string | null
          next_step?: string | null
          created_at?: string
        }
        Relationships: []
      }
      builds: {
        Row: {
          id: string
          workspace_id: string
          name: string
          business_type: string
          stage: string
          week_goal: string | null
          next_action: string | null
          priority: string
          status: string
          fields: Json
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          business_type?: string
          stage?: string
          week_goal?: string | null
          next_action?: string | null
          priority?: string
          status?: string
          fields?: Json
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          business_type?: string
          stage?: string
          week_goal?: string | null
          next_action?: string | null
          priority?: string
          status?: string
          fields?: Json
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          locale: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          locale?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          locale?: string
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          type: string
          amount: number
          category: string | null
          date: string
          note: string | null
          moved_forward: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id?: string | null
          type: string
          amount: number
          category?: string | null
          date?: string
          note?: string | null
          moved_forward?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string | null
          type?: string
          amount?: number
          category?: string | null
          date?: string
          note?: string | null
          moved_forward?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row aliases used across the app
export type Build = Database["public"]["Tables"]["builds"]["Row"]
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]
export type Log = Database["public"]["Tables"]["logs"]["Row"]
export type Experiment = Database["public"]["Tables"]["experiments"]["Row"]
export type Offer = Database["public"]["Tables"]["offers"]["Row"]
export type Contact = Database["public"]["Tables"]["contacts"]["Row"]
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]

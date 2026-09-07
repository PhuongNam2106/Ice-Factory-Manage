export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          payment_term_days: number
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          payment_term_days?: number
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          payment_term_days?: number
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_loss_report_versions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          report_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          report_id: string
          snapshot: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          report_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_loss_report_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_loss_report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_loss_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_loss_reports: {
        Row: {
          classification: Database["public"]["Enums"]["loss_classification"]
          closing_bags: number
          created_at: string
          created_by: string
          difference_bags: number
          difference_pct: number | null
          id: string
          note: string | null
          opening_bags: number
          operating_day: string
          produced_bags: number
          requires_review: boolean
          sold_bags: number
          source_snapshot: Json
          updated_at: string
          updated_by: string
          version: number
          warning_confirmed_at: string | null
          warning_confirmed_by: string | null
          warning_pct: number
        }
        Insert: {
          classification: Database["public"]["Enums"]["loss_classification"]
          closing_bags: number
          created_at?: string
          created_by: string
          difference_bags: number
          difference_pct?: number | null
          id?: string
          note?: string | null
          opening_bags: number
          operating_day: string
          produced_bags: number
          requires_review: boolean
          sold_bags: number
          source_snapshot: Json
          updated_at?: string
          updated_by: string
          version?: number
          warning_confirmed_at?: string | null
          warning_confirmed_by?: string | null
          warning_pct: number
        }
        Update: {
          classification?: Database["public"]["Enums"]["loss_classification"]
          closing_bags?: number
          created_at?: string
          created_by?: string
          difference_bags?: number
          difference_pct?: number | null
          id?: string
          note?: string | null
          opening_bags?: number
          operating_day?: string
          produced_bags?: number
          requires_review?: boolean
          sold_bags?: number
          source_snapshot?: Json
          updated_at?: string
          updated_by?: string
          version?: number
          warning_confirmed_at?: string | null
          warning_confirmed_by?: string | null
          warning_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_loss_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_loss_reports_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: true
            referencedRelation: "daily_dashboard"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "daily_loss_reports_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: true
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "daily_loss_reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_loss_reports_warning_confirmed_by_fkey"
            columns: ["warning_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_attachments: {
        Row: {
          bucket_id: string
          content_type: string
          created_at: string
          expense_id: string
          id: string
          object_path: string
          original_name: string
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          bucket_id?: string
          content_type: string
          created_at?: string
          expense_id: string
          id?: string
          object_path: string
          original_name: string
          size_bytes: number
          uploaded_by: string
        }
        Update: {
          bucket_id?: string
          content_type?: string
          created_at?: string
          expense_id?: string
          id?: string
          object_path?: string
          original_name?: string
          size_bytes?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_vnd: number
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category_id: string
          created_at: string
          created_by: string
          id: string
          idempotency_key: string
          note: string | null
          occurred_at: string
          operating_day: string
          payee: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["expense_status"]
          updated_at: string
          version: number
        }
        Insert: {
          amount_vnd: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id: string
          created_at?: string
          created_by: string
          id?: string
          idempotency_key: string
          note?: string | null
          occurred_at: string
          operating_day: string
          payee: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          amount_vnd?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id?: string
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string
          note?: string | null
          occurred_at?: string
          operating_day?: string
          payee?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "daily_dashboard"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "expenses_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "expenses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          actor_id: string
          completed_at: string | null
          created_at: string
          entity_id: string | null
          key: string
          operation: string
          response: Json | null
          status: string
        }
        Insert: {
          actor_id: string
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          key: string
          operation: string
          response?: Json | null
          status?: string
        }
        Update: {
          actor_id?: string
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          key?: string
          operation?: string
          response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_ledger: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["inventory_entry_kind"]
          note: string | null
          operating_day: string
          quantity_delta_bags: number
          reversal_of_id: string | null
          source_id: string
          source_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind: Database["public"]["Enums"]["inventory_entry_kind"]
          note?: string | null
          operating_day: string
          quantity_delta_bags: number
          reversal_of_id?: string | null
          source_id: string
          source_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["inventory_entry_kind"]
          note?: string | null
          operating_day?: string
          quantity_delta_bags?: number
          reversal_of_id?: string | null
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "daily_dashboard"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "inventory_ledger_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "inventory_ledger_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: false
            referencedRelation: "inventory_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_harvest_revisions: {
        Row: {
          changed_at: string
          changed_by: string
          harvest_id: string
          id: number
          new_quantity: number
          old_quantity: number | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          harvest_id: string
          id?: never
          new_quantity: number
          old_quantity?: number | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          harvest_id?: string
          id?: never
          new_quantity?: number
          old_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_harvest_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_harvest_revisions_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "machine_harvests"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_harvests: {
        Row: {
          bag_quantity: number | null
          created_at: string
          harvested_at: string
          harvested_by: string
          id: string
          machine_id: string
          machine_run_id: string
          quantity_updated_at: string | null
          quantity_updated_by: string | null
        }
        Insert: {
          bag_quantity?: number | null
          created_at?: string
          harvested_at: string
          harvested_by: string
          id?: string
          machine_id: string
          machine_run_id: string
          quantity_updated_at?: string | null
          quantity_updated_by?: string | null
        }
        Update: {
          bag_quantity?: number | null
          created_at?: string
          harvested_at?: string
          harvested_by?: string
          id?: string
          machine_id?: string
          machine_run_id?: string
          quantity_updated_at?: string | null
          quantity_updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_harvests_harvested_by_fkey"
            columns: ["harvested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_harvests_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_harvests_machine_run_id_machine_id_fkey"
            columns: ["machine_run_id", "machine_id"]
            isOneToOne: false
            referencedRelation: "machine_runs"
            referencedColumns: ["id", "machine_id"]
          },
          {
            foreignKeyName: "machine_harvests_quantity_updated_by_fkey"
            columns: ["quantity_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_runs: {
        Row: {
          created_at: string
          id: string
          machine_id: string
          production_day_id: string
          started_at: string
          started_by: string
          stopped_at: string | null
          stopped_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id: string
          production_day_id: string
          started_at: string
          started_by: string
          stopped_at?: string | null
          stopped_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string
          production_day_id?: string
          started_at?: string
          started_by?: string
          stopped_at?: string | null
          stopped_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_runs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_runs_production_day_id_fkey"
            columns: ["production_day_id"]
            isOneToOne: false
            referencedRelation: "production_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_runs_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_runs_stopped_by_fkey"
            columns: ["stopped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          code: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_days: {
        Row: {
          day: string
          id: string
          locked_at: string | null
          locked_by: string | null
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          snapshot: Json | null
          snapshot_version: number
          status: Database["public"]["Enums"]["operating_day_status"]
        }
        Insert: {
          day: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          snapshot?: Json | null
          snapshot_version?: number
          status?: Database["public"]["Enums"]["operating_day_status"]
        }
        Update: {
          day?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          snapshot?: Json | null
          snapshot_version?: number
          status?: Database["public"]["Enums"]["operating_day_status"]
        }
        Relationships: [
          {
            foreignKeyName: "operating_days_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_days_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_action_requests: {
        Row: {
          actor_id: string
          completed_at: string | null
          created_at: string
          machine_id: string
          operation: string
          request_id: string
          response: Json | null
        }
        Insert: {
          actor_id: string
          completed_at?: string | null
          created_at?: string
          machine_id: string
          operation: string
          request_id: string
          response?: Json | null
        }
        Update: {
          actor_id?: string
          completed_at?: string | null
          created_at?: string
          machine_id?: string
          operation?: string
          request_id?: string
          response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "production_action_requests_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_action_requests_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      production_days: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          production_date: string
          reopened_at: string | null
          reopened_by: string | null
          starts_at: string
          status: Database["public"]["Enums"]["operating_day_status"]
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          production_date: string
          reopened_at?: string | null
          reopened_by?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["operating_day_status"]
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          production_date?: string
          reopened_at?: string | null
          reopened_by?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["operating_day_status"]
        }
        Relationships: [
          {
            foreignKeyName: "production_days_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_days_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      receipt_allocations: {
        Row: {
          amount_vnd: number
          created_at: string
          id: string
          receipt_id: string
          receivable_id: string
        }
        Insert: {
          amount_vnd: number
          created_at?: string
          id?: string
          receipt_id: string
          receivable_id: string
        }
        Update: {
          amount_vnd?: number
          created_at?: string
          id?: string
          receipt_id?: string
          receivable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount_vnd: number
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          idempotency_key: string | null
          note: string | null
          occurred_at: string
          operating_day: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          source_sale_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          version: number
        }
        Insert: {
          amount_vnd: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          id?: string
          idempotency_key?: string | null
          note?: string | null
          occurred_at: string
          operating_day: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          source_sale_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          amount_vnd?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          idempotency_key?: string | null
          note?: string | null
          occurred_at?: string
          operating_day?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          source_sale_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "daily_dashboard"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "receipts_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "receipts_source_sale_id_fkey"
            columns: ["source_sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          created_at: string
          customer_id: string
          due_date: string
          id: string
          operating_day: string
          original_amount_vnd: number
          outstanding_amount_vnd: number
          sale_id: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          due_date: string
          id?: string
          operating_day: string
          original_amount_vnd: number
          outstanding_amount_vnd: number
          sale_id: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          due_date?: string
          id?: string
          operating_day?: string
          original_amount_vnd?: number
          outstanding_amount_vnd?: number
          sale_id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "receivables_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "daily_dashboard"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "receivables_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "receivables_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_lines: {
        Row: {
          created_at: string
          id: string
          line_number: number
          line_total_vnd: number | null
          quantity_bags: number
          sale_id: string
          unit_price_vnd: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_number: number
          line_total_vnd?: number | null
          quantity_bags: number
          sale_id: string
          unit_price_vnd: number
        }
        Update: {
          created_at?: string
          id?: string
          line_number?: number
          line_total_vnd?: number | null
          quantity_bags?: number
          sale_id?: string
          unit_price_vnd?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["sale_kind"]
          note: string | null
          occurred_at: string
          operating_day: string
          paid_now_vnd: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          shift_code: string | null
          status: Database["public"]["Enums"]["document_status"]
          total_vnd: number
          updated_at: string
          version: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          id?: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["sale_kind"]
          note?: string | null
          occurred_at: string
          operating_day: string
          paid_now_vnd: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          shift_code?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          total_vnd: number
          updated_at?: string
          version?: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["sale_kind"]
          note?: string | null
          occurred_at?: string
          operating_day?: string
          paid_now_vnd?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shift_code?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          total_vnd?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "daily_dashboard"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "sales_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
        ]
      }
      settings: {
        Row: {
          allow_negative_stock: boolean
          id: boolean
          loss_warning_pct: number
          operating_day_cutover_at: string | null
          production_harvest_reminder_minutes: number
          stock_variance_warning_pct: number
          time_zone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_negative_stock?: boolean
          id?: boolean
          loss_warning_pct?: number
          operating_day_cutover_at?: string | null
          production_harvest_reminder_minutes?: number
          stock_variance_warning_pct?: number
          time_zone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_negative_stock?: boolean
          id?: boolean
          loss_warning_pct?: number
          operating_day_cutover_at?: string | null
          production_harvest_reminder_minutes?: number
          stock_variance_warning_pct?: number
          time_zone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          actual_bags: number
          adjustment_entry_id: string | null
          created_at: string
          created_by: string
          expected_bags: number
          id: string
          idempotency_key: string
          note: string | null
          operating_day: string
          requires_review: boolean
          variance_bags: number | null
          variance_pct: number | null
          warning_pct: number
        }
        Insert: {
          actual_bags: number
          adjustment_entry_id?: string | null
          created_at?: string
          created_by: string
          expected_bags: number
          id?: string
          idempotency_key: string
          note?: string | null
          operating_day: string
          requires_review: boolean
          variance_bags?: number | null
          variance_pct?: number | null
          warning_pct: number
        }
        Update: {
          actual_bags?: number
          adjustment_entry_id?: string | null
          created_at?: string
          created_by?: string
          expected_bags?: number
          id?: string
          idempotency_key?: string
          note?: string | null
          operating_day?: string
          requires_review?: boolean
          variance_bags?: number | null
          variance_pct?: number | null
          warning_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_adjustment_entry_id_fkey"
            columns: ["adjustment_entry_id"]
            isOneToOne: false
            referencedRelation: "inventory_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "daily_dashboard"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "stock_counts_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
        ]
      }
    }
    Views: {
      daily_dashboard: {
        Row: {
          approved_expense_vnd: number | null
          closing_bags: number | null
          collected_vnd: number | null
          day: string | null
          difference_bags: number | null
          difference_pct: number | null
          expected_closing_bags: number | null
          loss_classification:
            | Database["public"]["Enums"]["loss_classification"]
            | null
          loss_report_exists: boolean | null
          loss_report_stale: boolean | null
          loss_requires_review: boolean | null
          loss_warning_pct: number | null
          new_debt_vnd: number | null
          opening_bags: number | null
          overdue_debt_vnd: number | null
          pending_expense_count: number | null
          pending_expense_vnd: number | null
          pending_harvest_count: number | null
          previous_day_unlocked: boolean | null
          production_bags: number | null
          retail_revenue_vnd: number | null
          sold_bags: number | null
          status: Database["public"]["Enums"]["operating_day_status"] | null
          total_debt_vnd: number | null
          wholesale_revenue_vnd: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_document: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_expected_version: number
          p_reason: string
        }
        Returns: Json
      }
      confirm_daily_loss_warning: {
        Args: { p_expected_version: number; p_report_id: string }
        Returns: Json
      }
      correct_document_occurred_at: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_expected_version: number
          p_idempotency_key: string
          p_occurred_at: string
        }
        Returns: Json
      }
      correct_production_action: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      create_expense: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      create_sale: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      delete_production_action: {
        Args: {
          p_action_type: string
          p_harvest_id: string
          p_idempotency_key: string
          p_machine_id: string
          p_run_id: string
        }
        Returns: Json
      }
      finalize_expense_attachment: {
        Args: {
          p_content_type: string
          p_expense_id: string
          p_object_path: string
          p_original_name: string
          p_size_bytes: number
        }
        Returns: Json
      }
      get_daily_loss_report: { Args: { p_day: string }; Returns: Json }
      get_daily_reconciliation: { Args: { p_day: string }; Returns: Json }
      get_production_board: {
        Args: { p_production_date: string }
        Returns: Json
      }
      get_production_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      lock_operating_day: { Args: { p_day: string }; Returns: Json }
      record_machine_harvest: {
        Args: { p_idempotency_key: string; p_machine_id: string }
        Returns: Json
      }
      record_receipt: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      record_stock_count: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      reopen_operating_day: {
        Args: { p_day: string; p_reason: string }
        Returns: Json
      }
      review_expense: {
        Args: { p_decision: string; p_expense_id: string; p_reason?: string }
        Returns: Json
      }
      save_daily_loss_report: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      set_customer_active: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: undefined
      }
      set_harvest_quantity: {
        Args: {
          p_harvest_id: string
          p_idempotency_key: string
          p_quantity: number
        }
        Returns: Json
      }
      set_machine_active: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: undefined
      }
      start_machine: {
        Args: { p_idempotency_key: string; p_machine_id: string }
        Returns: Json
      }
      stop_machine: {
        Args: { p_idempotency_key: string; p_machine_id: string }
        Returns: Json
      }
      upsert_customer: {
        Args: {
          p_address: string
          p_id: string
          p_name: string
          p_payment_term_days: number
          p_phone: string
        }
        Returns: string
      }
      upsert_machine: {
        Args: { p_code: string; p_id: string; p_name: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "employee" | "manager"
      document_status: "active" | "cancelled"
      expense_status: "pending" | "approved" | "rejected" | "cancelled"
      inventory_entry_kind:
        | "opening"
        | "production"
        | "sale"
        | "adjustment"
        | "reversal"
      loss_classification: "matched" | "loss" | "surplus" | "no_production"
      operating_day_status: "open" | "locked"
      payment_method: "cash" | "bank_transfer"
      sale_kind: "wholesale" | "retail"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["employee", "manager"],
      document_status: ["active", "cancelled"],
      expense_status: ["pending", "approved", "rejected", "cancelled"],
      inventory_entry_kind: [
        "opening",
        "production",
        "sale",
        "adjustment",
        "reversal",
      ],
      loss_classification: ["matched", "loss", "surplus", "no_production"],
      operating_day_status: ["open", "locked"],
      payment_method: ["cash", "bank_transfer"],
      sale_kind: ["wholesale", "retail"],
    },
  },
} as const

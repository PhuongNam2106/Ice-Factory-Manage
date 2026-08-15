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
          category_id: string
          created_at: string
          created_by: string
          id: string
          idempotency_key: string
          note: string | null
          operating_day: string
          payee: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["expense_status"]
          updated_at: string
        }
        Insert: {
          amount_vnd: number
          category_id: string
          created_at?: string
          created_by: string
          id?: string
          idempotency_key: string
          note?: string | null
          operating_day: string
          payee: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
        }
        Update: {
          amount_vnd?: number
          category_id?: string
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string
          note?: string | null
          operating_day?: string
          payee?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
        }
        Relationships: [
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
          locked_at: string | null
          locked_by: string | null
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          snapshot: Json | null
          status: Database["public"]["Enums"]["operating_day_status"]
        }
        Insert: {
          day: string
          locked_at?: string | null
          locked_by?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          snapshot?: Json | null
          status?: Database["public"]["Enums"]["operating_day_status"]
        }
        Update: {
          day?: string
          locked_at?: string | null
          locked_by?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          snapshot?: Json | null
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
      production_batches: {
        Row: {
          created_at: string
          created_by: string
          end_time: string
          good_bags: number
          id: string
          idempotency_key: string
          machine_id: string
          note: string | null
          operating_day: string
          rejected_bags: number
          shift_code: string
          start_time: string
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          end_time: string
          good_bags: number
          id?: string
          idempotency_key: string
          machine_id: string
          note?: string | null
          operating_day: string
          rejected_bags?: number
          shift_code: string
          start_time: string
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          end_time?: string
          good_bags?: number
          id?: string
          idempotency_key?: string
          machine_id?: string
          note?: string | null
          operating_day?: string
          rejected_bags?: number
          shift_code?: string
          start_time?: string
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
        ]
      }
      production_shift_totals: {
        Row: {
          created_at: string
          created_by: string
          good_bags: number
          id: string
          idempotency_key: string
          machine_id: string
          note: string | null
          operating_day: string
          rejected_bags: number
          shift_code: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          good_bags: number
          id?: string
          idempotency_key: string
          machine_id: string
          note?: string | null
          operating_day: string
          rejected_bags?: number
          shift_code: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          good_bags?: number
          id?: string
          idempotency_key?: string
          machine_id?: string
          note?: string | null
          operating_day?: string
          rejected_bags?: number
          shift_code?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_shift_totals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shift_totals_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shift_totals_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
        ]
      }
      production_source_selections: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          inventory_entry_id: string | null
          is_confirmed: boolean
          machine_id: string
          official_quantity_bags: number
          operating_day: string
          selected_source: Database["public"]["Enums"]["production_source_kind"]
          shift_code: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          inventory_entry_id?: string | null
          is_confirmed?: boolean
          machine_id: string
          official_quantity_bags?: number
          operating_day: string
          selected_source: Database["public"]["Enums"]["production_source_kind"]
          shift_code: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          inventory_entry_id?: string | null
          is_confirmed?: boolean
          machine_id?: string
          official_quantity_bags?: number
          operating_day?: string
          selected_source?: Database["public"]["Enums"]["production_source_kind"]
          shift_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_source_selections_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_source_selections_inventory_entry_id_fkey"
            columns: ["inventory_entry_id"]
            isOneToOne: false
            referencedRelation: "inventory_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_source_selections_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_source_selections_operating_day_fkey"
            columns: ["operating_day"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
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
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          idempotency_key: string | null
          note: string | null
          operating_day: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          source_sale_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          version: number
        }
        Insert: {
          amount_vnd: number
          created_at?: string
          created_by: string
          customer_id?: string | null
          id?: string
          idempotency_key?: string | null
          note?: string | null
          operating_day: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          source_sale_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          amount_vnd?: number
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          idempotency_key?: string | null
          note?: string | null
          operating_day?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          source_sale_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
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
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["sale_kind"]
          note: string | null
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
          created_at?: string
          created_by: string
          customer_id?: string | null
          id?: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["sale_kind"]
          note?: string | null
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
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["sale_kind"]
          note?: string | null
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
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
        ]
      }
      settings: {
        Row: {
          allow_negative_stock: boolean
          id: boolean
          stock_variance_warning_pct: number
          time_zone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_negative_stock?: boolean
          id?: boolean
          stock_variance_warning_pct?: number
          time_zone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_negative_stock?: boolean
          id?: boolean
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
            referencedRelation: "operating_days"
            referencedColumns: ["day"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_expense: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      create_sale: {
        Args: { p_idempotency_key: string; p_input: Json }
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
      record_production_batch: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      record_production_shift_total: {
        Args: { p_idempotency_key: string; p_input: Json }
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
      review_expense: {
        Args: { p_decision: string; p_expense_id: string; p_reason?: string }
        Returns: Json
      }
      select_production_source: {
        Args: { p_idempotency_key: string; p_input: Json }
        Returns: Json
      }
      set_customer_active: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: undefined
      }
      set_machine_active: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: undefined
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
      expense_status: "pending" | "approved" | "rejected"
      inventory_entry_kind:
        | "opening"
        | "production"
        | "sale"
        | "adjustment"
        | "reversal"
      operating_day_status: "open" | "locked"
      payment_method: "cash" | "bank_transfer"
      production_source_kind: "batches" | "shift_total"
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
      expense_status: ["pending", "approved", "rejected"],
      inventory_entry_kind: [
        "opening",
        "production",
        "sale",
        "adjustment",
        "reversal",
      ],
      operating_day_status: ["open", "locked"],
      payment_method: ["cash", "bank_transfer"],
      production_source_kind: ["batches", "shift_total"],
      sale_kind: ["wholesale", "retail"],
    },
  },
} as const

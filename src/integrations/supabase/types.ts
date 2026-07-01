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
      aie_lines: {
        Row: {
          aie_id: string
          amount: number
          created_at: string
          id: string
          sub_item_code: string
        }
        Insert: {
          aie_id: string
          amount: number
          created_at?: string
          id?: string
          sub_item_code: string
        }
        Update: {
          aie_id?: string
          amount?: number
          created_at?: string
          id?: string
          sub_item_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "aie_lines_aie_id_fkey"
            columns: ["aie_id"]
            isOneToOne: false
            referencedRelation: "aie_records"
            referencedColumns: ["id"]
          },
        ]
      }
      aie_records: {
        Row: {
          aie_no: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          fiscal_year: number
          id: string
          inflow_id: string | null
          issue_date: string
          proposal_id: string | null
          recipient_unit: string
          retirement_status: string
          return_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          sub_item_code: string | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          aie_no: string
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          fiscal_year: number
          id?: string
          inflow_id?: string | null
          issue_date: string
          proposal_id?: string | null
          recipient_unit: string
          retirement_status?: string
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          sub_item_code?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          aie_no?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          fiscal_year?: number
          id?: string
          inflow_id?: string | null
          issue_date?: string
          proposal_id?: string | null
          recipient_unit?: string
          retirement_status?: string
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          sub_item_code?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aie_records_fiscal_year_fkey"
            columns: ["fiscal_year"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "aie_records_inflow_id_fkey"
            columns: ["inflow_id"]
            isOneToOne: false
            referencedRelation: "fund_inflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aie_records_sub_item_code_fkey"
            columns: ["sub_item_code"]
            isOneToOne: false
            referencedRelation: "budget_sub_items"
            referencedColumns: ["code"]
          },
        ]
      }
      app_settings: {
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
      approval_actions: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          record_id: string
          record_type: string
          remarks: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          id?: string
          record_id: string
          record_type: string
          remarks?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          record_id?: string
          record_type?: string
          remarks?: string | null
        }
        Relationships: []
      }
      approval_delegations: {
        Row: {
          created_at: string
          delegate: string
          delegator: string
          ends_on: string
          id: string
          reason: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          starts_on: string
        }
        Insert: {
          created_at?: string
          delegate: string
          delegator?: string
          ends_on: string
          id?: string
          reason?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          starts_on: string
        }
        Update: {
          created_at?: string
          delegate?: string
          delegator?: string
          ends_on?: string
          id?: string
          reason?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          starts_on?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          at: string
          diff: Json | null
          id: number
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          diff?: Json | null
          id?: number
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          diff?: Json | null
          id?: number
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          code: string
          name: string
          sort: number
        }
        Insert: {
          code: string
          name: string
          sort?: number
        }
        Update: {
          code?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      budget_sub_items: {
        Row: {
          category_code: string
          code: string
          name: string
          sort: number
        }
        Insert: {
          category_code: string
          code: string
          name: string
          sort?: number
        }
        Update: {
          category_code?: string
          code?: string
          name?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_sub_items_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      carry_over_lines: {
        Row: {
          created_at: string
          expended: number
          id: string
          inflows: number
          opening_balance: number
          percent_utilized: number
          period_id: string
          residual: number
          sub_item_code: string
        }
        Insert: {
          created_at?: string
          expended?: number
          id?: string
          inflows?: number
          opening_balance?: number
          percent_utilized?: number
          period_id: string
          residual?: number
          sub_item_code: string
        }
        Update: {
          created_at?: string
          expended?: number
          id?: string
          inflows?: number
          opening_balance?: number
          percent_utilized?: number
          period_id?: string
          residual?: number
          sub_item_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "carry_over_lines_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "carry_over_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      carry_over_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          fiscal_year: number
          id: string
          notes: string | null
          opening_balance: number
          percent_utilized: number
          period_month: number
          residual: number
          return_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          submitted_at: string | null
          submitted_by: string | null
          total_expended: number
          total_inflows: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          fiscal_year: number
          id?: string
          notes?: string | null
          opening_balance?: number
          percent_utilized?: number
          period_month: number
          residual?: number
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          total_expended?: number
          total_inflows?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          opening_balance?: number
          percent_utilized?: number
          period_month?: number
          residual?: number
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          total_expended?: number
          total_inflows?: number
          updated_at?: string
        }
        Relationships: []
      }
      distribution_batches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          distributed_total: number
          fiscal_year: number
          hq_retention: number
          id: string
          period_month: number
          return_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          submitted_at: string | null
          submitted_by: string | null
          total_inflow: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          distributed_total?: number
          fiscal_year: number
          hq_retention?: number
          id?: string
          period_month: number
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          total_inflow?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          distributed_total?: number
          fiscal_year?: number
          hq_retention?: number
          id?: string
          period_month?: number
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          total_inflow?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_batches_fiscal_year_fkey"
            columns: ["fiscal_year"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["year"]
          },
        ]
      }
      distribution_lines: {
        Row: {
          amount: number
          batch_id: string
          formation_id: string
          id: string
          sub_item_code: string
        }
        Insert: {
          amount: number
          batch_id: string
          formation_id: string
          id?: string
          sub_item_code: string
        }
        Update: {
          amount?: number
          batch_id?: string
          formation_id?: string
          id?: string
          sub_item_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_lines_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "distribution_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_lines_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_lines_sub_item_code_fkey"
            columns: ["sub_item_code"]
            isOneToOne: false
            referencedRelation: "budget_sub_items"
            referencedColumns: ["code"]
          },
        ]
      }
      documents: {
        Row: {
          bucket_path: string
          created_at: string
          id: string
          linked_id: string | null
          linked_table: string | null
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string
        }
        Insert: {
          bucket_path: string
          created_at?: string
          id?: string
          linked_id?: string | null
          linked_table?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string
        }
        Update: {
          bucket_path?: string
          created_at?: string
          id?: string
          linked_id?: string | null
          linked_table?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string
        }
        Relationships: []
      }
      expenditures: {
        Row: {
          aie_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          expense_date: string
          fiscal_year: number
          gross_amount: number
          id: string
          net_amount: number | null
          payee: string
          return_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          sub_item_code: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          voucher_no: string
          wht_amount: number
        }
        Insert: {
          aie_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date: string
          fiscal_year: number
          gross_amount: number
          id?: string
          net_amount?: number | null
          payee: string
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          sub_item_code: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          voucher_no: string
          wht_amount?: number
        }
        Update: {
          aie_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date?: string
          fiscal_year?: number
          gross_amount?: number
          id?: string
          net_amount?: number | null
          payee?: string
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          sub_item_code?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          voucher_no?: string
          wht_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenditures_aie_id_fkey"
            columns: ["aie_id"]
            isOneToOne: false
            referencedRelation: "aie_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenditures_fiscal_year_fkey"
            columns: ["fiscal_year"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "expenditures_sub_item_code_fkey"
            columns: ["sub_item_code"]
            isOneToOne: false
            referencedRelation: "budget_sub_items"
            referencedColumns: ["code"]
          },
        ]
      }
      export_audit_log: {
        Row: {
          exported_at: string
          fiscal_year: number
          forced: boolean
          format: string
          id: string
          mismatch_count: number
          report_type: string
          tolerance_kobo: number
          user_email: string | null
          user_id: string
        }
        Insert: {
          exported_at?: string
          fiscal_year: number
          forced?: boolean
          format: string
          id?: string
          mismatch_count?: number
          report_type: string
          tolerance_kobo?: number
          user_email?: string | null
          user_id?: string
        }
        Update: {
          exported_at?: string
          fiscal_year?: number
          forced?: boolean
          format?: string
          id?: string
          mismatch_count?: number
          report_type?: string
          tolerance_kobo?: number
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fiscal_years: {
        Row: {
          appropriation_act_amount: number
          revised_amount: number
          status: string
          year: number
        }
        Insert: {
          appropriation_act_amount?: number
          revised_amount?: number
          status?: string
          year: number
        }
        Update: {
          appropriation_act_amount?: number
          revised_amount?: number
          status?: string
          year?: number
        }
        Relationships: []
      }
      formations: {
        Row: {
          created_at: string
          id: string
          name: string
          state: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          state: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          state?: string
          type?: string
        }
        Relationships: []
      }
      fund_inflows: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          fiscal_year: number
          id: string
          inflow_date: string
          notes: string | null
          reference_no: string
          return_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: Database["public"]["Enums"]["txn_status"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          fiscal_year: number
          id?: string
          inflow_date: string
          notes?: string | null
          reference_no: string
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          status?: Database["public"]["Enums"]["txn_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          fiscal_year?: number
          id?: string
          inflow_date?: string
          notes?: string | null
          reference_no?: string
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["txn_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_inflows_fiscal_year_fkey"
            columns: ["fiscal_year"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["year"]
          },
        ]
      }
      notifications: {
        Row: {
          actor: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          source_id: string | null
          source_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          is_active: boolean
          signature_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          is_active?: boolean
          signature_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          is_active?: boolean
          signature_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          department: string
          fiscal_year: number
          id: string
          justification: string | null
          return_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          sub_item_code: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          department: string
          fiscal_year: number
          id?: string
          justification?: string | null
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          sub_item_code: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          department?: string
          fiscal_year?: number
          id?: string
          justification?: string | null
          return_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          sub_item_code?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_fiscal_year_fkey"
            columns: ["fiscal_year"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "proposals_sub_item_code_fkey"
            columns: ["sub_item_code"]
            isOneToOne: false
            referencedRelation: "budget_sub_items"
            referencedColumns: ["code"]
          },
        ]
      }
      txn_comments: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          record_id: string
          record_type: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          record_id: string
          record_type: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          record_id?: string
          record_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_approval_sla: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          fiscal_year: number | null
          hours_pending: number | null
          hours_to_approve: number | null
          hours_to_review: number | null
          id: string | null
          record_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bootstrap_profile: { Args: never; Returns: undefined }
      current_user_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      delegated_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "SYSADMIN"
        | "BUDGET_DIR"
        | "BUDGET_OFF"
        | "BUDGET_CLK"
        | "AUDITOR"
        | "REPORT_VIEWER"
      txn_status:
        | "DRAFT"
        | "SUBMITTED"
        | "OFFICER_REVIEWED"
        | "APPROVED"
        | "RETURNED"
        | "CANCELLED"
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
      app_role: [
        "SYSADMIN",
        "BUDGET_DIR",
        "BUDGET_OFF",
        "BUDGET_CLK",
        "AUDITOR",
        "REPORT_VIEWER",
      ],
      txn_status: [
        "DRAFT",
        "SUBMITTED",
        "OFFICER_REVIEWED",
        "APPROVED",
        "RETURNED",
        "CANCELLED",
      ],
    },
  },
} as const

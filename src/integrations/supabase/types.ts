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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cnpj_leads: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cnae_codigo: string | null
          cnae_principal: string | null
          cnpj: string
          created_at: string
          data_abertura: string | null
          email: string | null
          id: string
          logradouro: string | null
          municipio: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          numero: string | null
          porte: string | null
          razao_social: string
          situacao_cadastral: string | null
          socios: string | null
          telefone1: string | null
          telefone2: string | null
          uf: string | null
          user_id: string
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_codigo?: string | null
          cnae_principal?: string | null
          cnpj: string
          created_at?: string
          data_abertura?: string | null
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte?: string | null
          razao_social?: string
          situacao_cadastral?: string | null
          socios?: string | null
          telefone1?: string | null
          telefone2?: string | null
          uf?: string | null
          user_id: string
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_codigo?: string | null
          cnae_principal?: string | null
          cnpj?: string
          created_at?: string
          data_abertura?: string | null
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte?: string | null
          razao_social?: string
          situacao_cadastral?: string | null
          socios?: string | null
          telefone1?: string | null
          telefone2?: string | null
          uf?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dispatch_group_contacts: {
        Row: {
          created_at: string
          group_id: string
          id: string
          name: string
          phone: string
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          name?: string
          phone: string
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          name?: string
          phone?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_group_contacts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "dispatch_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          mineracao_id: string
          nicho: string | null
          nome: string
          nota: number | null
          opportunity_score: number | null
          pain_score: number | null
          potencial_trafego: string | null
          site: string | null
          telefone: string | null
          tem_site_proprio: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          mineracao_id: string
          nicho?: string | null
          nome?: string
          nota?: number | null
          opportunity_score?: number | null
          pain_score?: number | null
          potencial_trafego?: string | null
          site?: string | null
          telefone?: string | null
          tem_site_proprio?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          mineracao_id?: string
          nicho?: string | null
          nome?: string
          nota?: number | null
          opportunity_score?: number | null
          pain_score?: number | null
          potencial_trafego?: string | null
          site?: string | null
          telefone?: string | null
          tem_site_proprio?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_mineracao_id_fkey"
            columns: ["mineracao_id"]
            isOneToOne: false
            referencedRelation: "mineracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          media_url: string | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mineracoes: {
        Row: {
          cidade: string
          created_at: string
          id: string
          palavra_chave: string
          total_leads: number
          user_id: string | null
        }
        Insert: {
          cidade: string
          created_at?: string
          id?: string
          palavra_chave: string
          total_leads?: number
          user_id?: string | null
        }
        Update: {
          cidade?: string
          created_at?: string
          id?: string
          palavra_chave?: string
          total_leads?: number
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_instances: {
        Row: {
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string
          owner: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name: string
          owner?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string
          owner?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_dispatches: {
        Row: {
          batch_pause: number
          batch_size: number
          contacts: Json
          created_at: string
          dispatch_mode: string
          dispatch_type: string
          id: string
          instance_name: string | null
          max_delay: number
          media_url: string | null
          message_text: string
          min_delay: number
          processed_at: string | null
          results: Json | null
          scheduled_at: string
          sent_count: number
          started_at: string | null
          status: string
          user_id: string
          variation_emojis: string | null
          variation_enabled: boolean
        }
        Insert: {
          batch_pause?: number
          batch_size?: number
          contacts?: Json
          created_at?: string
          dispatch_mode?: string
          dispatch_type?: string
          id?: string
          instance_name?: string | null
          max_delay?: number
          media_url?: string | null
          message_text?: string
          min_delay?: number
          processed_at?: string | null
          results?: Json | null
          scheduled_at: string
          sent_count?: number
          started_at?: string | null
          status?: string
          user_id: string
          variation_emojis?: string | null
          variation_enabled?: boolean
        }
        Update: {
          batch_pause?: number
          batch_size?: number
          contacts?: Json
          created_at?: string
          dispatch_mode?: string
          dispatch_type?: string
          id?: string
          instance_name?: string | null
          max_delay?: number
          media_url?: string | null
          message_text?: string
          min_delay?: number
          processed_at?: string | null
          results?: Json | null
          scheduled_at?: string
          sent_count?: number
          started_at?: string | null
          status?: string
          user_id?: string
          variation_emojis?: string | null
          variation_enabled?: boolean
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_settings: {
        Row: {
          apify_api_key: string
          created_at: string
          evolution_api_key: string | null
          evolution_api_url: string | null
          id: string
          openai_api_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apify_api_key?: string
          created_at?: string
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          id?: string
          openai_api_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apify_api_key?: string
          created_at?: string
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          id?: string
          openai_api_key?: string | null
          updated_at?: string
          user_id?: string
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
    },
  },
} as const

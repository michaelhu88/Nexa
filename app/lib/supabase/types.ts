export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          url_slug: string | null;
          thumbnail_url: string | null;
          settings: any;
          metadata: any;
          is_public: boolean;
          is_template: boolean;
          last_accessed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          url_slug?: string | null;
          thumbnail_url?: string | null;
          settings?: any;
          metadata?: any;
          is_public?: boolean;
          is_template?: boolean;
          last_accessed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          url_slug?: string | null;
          thumbnail_url?: string | null;
          settings?: any;
          metadata?: any;
          is_public?: boolean;
          is_template?: boolean;
          last_accessed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_files: {
        Row: {
          id: string;
          project_id: string;
          file_path: string;
          content: string | null;
          content_binary: ArrayBuffer | null;
          is_binary: boolean;
          file_type: string | null;
          file_size: number | null;
          checksum: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_path: string;
          content?: string | null;
          content_binary?: ArrayBuffer | null;
          is_binary?: boolean;
          file_type?: string | null;
          file_size?: number | null;
          checksum?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          file_path?: string;
          content?: string | null;
          content_binary?: ArrayBuffer | null;
          is_binary?: boolean;
          file_type?: string | null;
          file_size?: number | null;
          checksum?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          project_id: string;
          message_id: string;
          role: 'user' | 'assistant' | 'system' | 'data';
          content: string;
          annotations: any | null;
          parent_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          message_id: string;
          role: 'user' | 'assistant' | 'system' | 'data';
          content: string;
          annotations?: any | null;
          parent_message_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          message_id?: string;
          role?: 'user' | 'assistant' | 'system' | 'data';
          content?: string;
          annotations?: any | null;
          parent_message_id?: string | null;
          created_at?: string;
        };
      };
      project_snapshots: {
        Row: {
          id: string;
          project_id: string;
          chat_message_id: string | null;
          name: string | null;
          description: string | null;
          snapshot_data: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          chat_message_id?: string | null;
          name?: string | null;
          description?: string | null;
          snapshot_data: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          chat_message_id?: string | null;
          name?: string | null;
          description?: string | null;
          snapshot_data?: any;
          created_at?: string;
        };
      };
      project_collaborators: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: 'viewer' | 'editor' | 'admin';
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: 'viewer' | 'editor' | 'admin';
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: 'viewer' | 'editor' | 'admin';
          invited_by?: string | null;
          created_at?: string;
        };
      };
      codebase_embeddings: {
        Row: {
          id: string;
          project_id: string | null;
          project_uuid: string | null;
          file_path: string;
          chunk_index: number;
          content: string;
          embedding: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          project_uuid?: string | null;
          file_path: string;
          chunk_index: number;
          content: string;
          embedding: number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          project_uuid?: string | null;
          file_path?: string;
          chunk_index?: number;
          content?: string;
          embedding?: number[];
          created_at?: string;
          updated_at?: string;
        };
      };
      indexing_status: {
        Row: {
          id: string;
          project_id: string | null;
          project_uuid: string | null;
          status: string;
          total_files: number;
          processed_files: number;
          failed_files: number;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          project_uuid?: string | null;
          status: string;
          total_files: number;
          processed_files?: number;
          failed_files?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          project_uuid?: string | null;
          status?: string;
          total_files?: number;
          processed_files?: number;
          failed_files?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_project_slug: {
        Args: {
          project_name: string;
          user_id: string;
        };
        Returns: string;
      };
      get_project_statistics: {
        Args: {
          project_id: string;
        };
        Returns: any;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

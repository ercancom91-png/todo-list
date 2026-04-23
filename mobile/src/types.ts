export interface Task {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
  user_id?: string;
  _pending?: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SessionUser | null;
}

export type FilterMode = "all" | "active" | "completed";

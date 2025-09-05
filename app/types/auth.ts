/**
 * Authentication types for NocoBase integration
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  nickname?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthToken {
  token: string;
  expires?: string;
}

export interface LoginResponse {
  data: {
    token: string;
    user: User;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

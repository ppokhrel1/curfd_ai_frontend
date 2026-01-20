export interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface RouteConfig {
  path: string;
  element: React.ReactElement;
  isProtected?: boolean;
}

export type Theme = 'light' | 'dark' | 'system';

export interface AppConfig {
  apiUrl: string;
  appName: string;
  version: string;
}
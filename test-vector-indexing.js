// Test file for vector indexing workflow
// This file contains various code patterns to test chunking and embedding

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

/**
 * User authentication utilities
 * This module handles user login, logout, and session management
 */

// Configuration constants
const API_BASE_URL = 'https://api.example.com';
const TOKEN_STORAGE_KEY = 'auth_token';

/**
 * Represents a user in the system
 * @interface User
 */
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

/**
 * Authentication response from the API
 * @interface AuthResponse  
 */
interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

/**
 * User authentication class
 * Handles all authentication operations including login, logout, and token management
 */
class AuthManager {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.loadTokenFromStorage();
  }

  /**
   * Loads authentication token from localStorage
   * @private
   */
  private loadTokenFromStorage(): void {
    try {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (savedToken) {
        this.token = savedToken;
        this.validateToken();
      }
    } catch (error) {
      console.error('Failed to load token from storage:', error);
    }
  }

  /**
   * Validates the current authentication token
   * @private
   */
  private async validateToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/validate`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      this.user = response.data.user;
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  /**
   * Authenticates user with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<AuthResponse>} Authentication response
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      const authData: AuthResponse = response.data;
      
      this.token = authData.token;
      this.user = authData.user;
      
      localStorage.setItem(TOKEN_STORAGE_KEY, authData.token);
      
      toast.success(`Welcome back, ${authData.user.name}!`);
      
      return authData;
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
      throw new Error('Authentication failed');
    }
  }

  /**
   * Logs out the current user and clears session data
   */
  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    toast.info('You have been logged out successfully.');
  }

  /**
   * Registers a new user account
   * @param {Omit<User, 'id' | 'createdAt'>} userData - User registration data
   * @param {string} password - User's chosen password
   */
  async register(userData: Omit<User, 'id' | 'createdAt'>, password: string): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...userData,
        password
      });

      return response.data;
    } catch (error) {
      toast.error('Registration failed. Please try again.');
      throw error;
    }
  }

  /**
   * Gets the current authenticated user
   * @returns {User | null} Current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Checks if user is currently authenticated
   * @returns {boolean} True if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  /**
   * Gets the current authentication token
   * @returns {string | null} Authentication token or null
   */
  getToken(): string | null {
    return this.token;
  }
}

/**
 * React hook for authentication management
 * Provides authentication state and methods to components
 */
export function useAuth() {
  const [authManager] = useState(() => new AuthManager());
  const [user, setUser] = useState<User | null>(authManager.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update user state when auth manager changes
    const currentUser = authManager.getCurrentUser();
    setUser(currentUser);
  }, [authManager]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authManager.login(email, password);
      setUser(result.user);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authManager.logout();
    setUser(null);
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt'>, password: string) => {
    setIsLoading(true);
    try {
      return await authManager.register(userData, password);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    login,
    logout,
    register,
    isLoading,
    isAuthenticated: authManager.isAuthenticated(),
    getToken: () => authManager.getToken()
  };
}

/**
 * Higher-order component for protecting routes that require authentication
 * @param {React.ComponentType} WrappedComponent - Component to protect
 */
export function withAuth<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <div className="loading-spinner">Checking authentication...</div>;
    }

    if (!isAuthenticated) {
      return <div className="auth-required">Please log in to access this page.</div>;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Utility function to make authenticated API requests
 * @param {string} url - API endpoint URL
 * @param {object} options - Request options
 */
export async function authenticatedRequest(url: string, options: RequestInit = {}) {
  const authManager = new AuthManager();
  const token = authManager.getToken();

  if (!token) {
    throw new Error('No authentication token available');
  }

  const authenticatedOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await fetch(`${API_BASE_URL}${url}`, authenticatedOptions);
  
  if (response.status === 401) {
    authManager.logout();
    throw new Error('Authentication expired. Please log in again.');
  }

  return response;
}

// Export the AuthManager class and related utilities
export { AuthManager, type User, type AuthResponse };

// Default export
export default AuthManager;
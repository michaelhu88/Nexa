import { map } from 'nanostores';
import type { AuthState, User, LoginCredentials } from '~/types/auth';
import { API_CONFIG, getAuthHeaders, buildUrl } from '~/lib/config/api';
import { logStore } from './logs';

const AUTH_TOKEN_KEY = 'nexa_auth_token';
const AUTH_USER_KEY = 'nexa_auth_user';

export const authStore = map<AuthState>({
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: false,
  error: null,
});

function initStore() {
  if (!import.meta.env.SSR) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userStr = localStorage.getItem(AUTH_USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        authStore.setKey('isAuthenticated', true);
        authStore.setKey('user', user);
        authStore.setKey('token', token);
        logStore.logSystem('Auth state restored from localStorage', { username: user.username });
      } catch {
        clearAuthData();
        logStore.logSystem('Failed to restore auth state, cleared localStorage');
      }
    }
  }
}

function clearAuthData() {
  if (!import.meta.env.SSR) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }

  authStore.setKey('isAuthenticated', false);
  authStore.setKey('user', null);
  authStore.setKey('token', null);
  authStore.setKey('error', null);
}

export async function login(credentials: LoginCredentials): Promise<void> {
  authStore.setKey('isLoading', true);
  authStore.setKey('error', null);

  try {
    // Try different credential formats in order
    const credentialFormats = [
      // Format 1: username field (most common for default admin)
      { username: credentials.username, password: credentials.password },

      // Format 2: email field (common for email-based logins)
      { email: credentials.username, password: credentials.password },

      // Format 3: account field (sometimes used)
      { account: credentials.username, password: credentials.password },
    ];

    let lastError: any = null;

    for (let i = 0; i < credentialFormats.length; i++) {
      const format = credentialFormats[i];
      const formatName = Object.keys(format)[0]; // 'username', 'email', or 'account'

      console.log(`Trying format ${i + 1}/3: ${formatName} field`);

      try {
        const response = await fetch(buildUrl(API_CONFIG.endpoints.auth.signIn), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(format),
        });

        const responseText = await response.text();
        console.log(`${formatName} format - Status:`, response.status);
        console.log(`${formatName} format - Body:`, responseText);

        if (response.ok) {
          // Success! Parse the response and continue with login
          const data = JSON.parse(responseText);
          console.log(`✅ Login successful with ${formatName} format:`, data);

          // Try different possible response structures
          let token, user;

          if (data.data?.token) {
            token = data.data.token;
            user = data.data.user;
          } else if (data.token) {
            token = data.token;
            user = data.user;
          } else if (data.access_token) {
            token = data.access_token;
            user = data.user;
          } else {
            console.log('Unknown response format, using entire response as user data');
            token = 'temp_token';
            user = { username: credentials.username, ...data };
          }

          if (!import.meta.env.SSR) {
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
          }

          authStore.setKey('isAuthenticated', true);
          authStore.setKey('user', user);
          authStore.setKey('token', token);

          logStore.logSystem('User logged in successfully', { username: user.username });

          return; // Success! Exit the function
        } else {
          // Parse error for this format
          try {
            const errorData = JSON.parse(responseText);
            lastError =
              errorData.errors?.[0]?.message ||
              errorData.error?.message ||
              errorData.message ||
              `HTTP ${response.status}`;
            console.log(`❌ ${formatName} format failed:`, errorData);
          } catch {
            lastError = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
      } catch (error) {
        console.log(`❌ ${formatName} format error:`, error);
        lastError = error instanceof Error ? error.message : 'Network error';
      }
    }

    // If we get here, all formats failed
    console.log('❌ All credential formats failed');

    const finalError = lastError || 'Login failed with all credential formats';
    authStore.setKey('error', finalError);
    logStore.logSystem('Login failed', { error: finalError });
    throw new AuthError(finalError);
  } catch (error) {
    const authError = error instanceof AuthError ? error : new AuthError('Login failed');
    authStore.setKey('error', authError.message);
    logStore.logSystem('Login failed', { error: authError.message });
    throw authError;
  } finally {
    authStore.setKey('isLoading', false);
  }
}

export async function logout(): Promise<void> {
  const currentToken = authStore.get().token;

  if (currentToken) {
    try {
      await fetch(buildUrl(API_CONFIG.endpoints.auth.signOut), {
        method: 'POST',
        headers: getAuthHeaders(currentToken),
      });
    } catch (error) {
      logStore.logSystem('Logout API call failed, but clearing local state', { error });
    }
  }

  clearAuthData();
  logStore.logSystem('User logged out');
}

export async function checkAuthStatus(): Promise<boolean> {
  const { token } = authStore.get();

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(buildUrl(API_CONFIG.endpoints.auth.check), {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      clearAuthData();
      return false;
    }

    return true;
  } catch {
    clearAuthData();
    return false;
  }
}

class AuthError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

// Initialize store when module loads
initStore();

import {
  PublicClientApplication,
  Configuration,
  AccountInfo,
  SilentRequest,
  PopupRequest,
} from '@azure/msal-browser';

// =============================================================================
// Azure Entra External ID (CIAM) — MSAL Browser Configuration
// =============================================================================

const tenantName = process.env.NEXT_PUBLIC_AZURE_TENANT_NAME!;
const tenantId   = process.env.NEXT_PUBLIC_AZURE_TENANT_ID!;
const clientId   = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!;

// Entra External ID CIAM authority
const authority = `https://${tenantName}.ciamlogin.com/${tenantId}`;

// Use the app origin as redirect URI (works for popup auth).
// Falls back to NEXT_PUBLIC_REDIRECT_URI env var (set in .env.local for dev).
const redirectUri = typeof window !== 'undefined'
  ? window.location.origin
  : process.env.NEXT_PUBLIC_REDIRECT_URI || 'https://lively-dune-00d7f1910.7.azurestaticapps.net';

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    knownAuthorities: [`${tenantName}.ciamlogin.com`], // Required for CIAM
    redirectUri,
    postLogoutRedirectUri: '/',
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation:          'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[MSAL][${level}]`, message);
        }
      },
      piiLoggingEnabled: false,
    },
  },
};

// =============================================================================
// Scopes
// =============================================================================
export const loginScopes: PopupRequest = {
  scopes: ['openid', 'profile', 'email'],
};

export const tokenScopes: SilentRequest = {
  scopes: ['openid', 'profile', 'email'],
  account: undefined,
};

// =============================================================================
// MSAL singleton
// =============================================================================
let msalInstance: PublicClientApplication | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (msalInstance) return msalInstance;
  msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise().catch(console.error);
  return msalInstance;
}

// =============================================================================
// Auth helpers
// =============================================================================
export async function getAccessToken(): Promise<string | null> {
  const msal    = await getMsalInstance();
  const accounts = msal.getAllAccounts();
  if (accounts.length === 0) return null;
  const account = accounts[0];
  try {
    const response = await msal.acquireTokenSilent({ ...tokenScopes, account });
    return response.accessToken;
  } catch {
    try {
      const response = await msal.acquireTokenPopup({ ...loginScopes, account });
      return response.accessToken;
    } catch {
      return null;
    }
  }
}

export async function getCurrentAccount(): Promise<AccountInfo | null> {
  const msal    = await getMsalInstance();
  const accounts = msal.getAllAccounts();
  return accounts[0] || null;
}

export async function isAuthenticated(): Promise<boolean> {
  const account = await getCurrentAccount();
  return account !== null;
}

export async function loginWithPopup(): Promise<{
  accessToken: string;
  account: AccountInfo;
} | null> {
  const msal = await getMsalInstance();
  try {
    const response = await msal.loginPopup(loginScopes);
    if (!response?.account) return null;
    return { accessToken: response.accessToken, account: response.account };
  } catch (error) {
    // Re-throw so the caller (LoginForm) can handle specific MSAL error codes
    throw error;
  }
}

export async function loginWithSignupPopup(): Promise<{
  accessToken: string;
  account: AccountInfo;
} | null> {
  const msal = await getMsalInstance();
  try {
    // prompt: 'create' tells Entra External ID CIAM to go directly to sign-up
    const response = await msal.loginPopup({
      ...loginScopes,
      prompt: 'create',
    });
    if (!response?.account) return null;
    return { accessToken: response.accessToken, account: response.account };
  } catch (error) {
    throw error;
  }
}

export async function logout(): Promise<void> {
  const msal    = await getMsalInstance();
  const account = await getCurrentAccount();
  await msal.logoutPopup({ account: account || undefined, postLogoutRedirectUri: '/' });
}

// =============================================================================
// API fetch helper
// =============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const token   = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: body.message || body.error || 'Request failed', status: res.status };
    }
    return { data: body as T, status: res.status };
  } catch (err) {
    console.error('[apiFetch]', err);
    return { error: 'Network error. Please check your connection.', status: 0 };
  }
}

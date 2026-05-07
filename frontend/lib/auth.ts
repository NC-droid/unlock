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

// Entra External ID authority format
const authority = `https://${tenantName}.ciamlogin.com/${tenantId}`;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    knownAuthorities:       [`${tenantName}.ciamlogin.com`], // Required for CIAM endpoint discovery
    redirectUri:            process.env.NEXT_PUBLIC_REDIRECT_URI || '/',
    postLogoutRedirectUri:  '/',
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation:        'sessionStorage', // More secure than localStorage
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
// Scopes — what we request from Azure
// =============================================================================
export const loginScopes: PopupRequest = {
  scopes: ['openid', 'profile', 'email'],
};

export const tokenScopes: SilentRequest = {
  scopes: ['openid', 'profile', 'email'],
  account: undefined, // Will be filled at call time
};

// =============================================================================
// MSAL instance (singleton)
// =============================================================================
let msalInstance: PublicClientApplication | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (msalInstance) return msalInstance;

  msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  // Handle redirect response on page load (if using redirect flow)
  await msalInstance.handleRedirectPromise().catch(console.error);

  return msalInstance;
}

// =============================================================================
// Auth helper: get access token (silent, fallback to popup)
// =============================================================================
export async function getAccessToken(): Promise<string | null> {
  const msal = await getMsalInstance();
  const accounts = msal.getAllAccounts();

  if (accounts.length === 0) return null;

  const account = accounts[0];

  try {
    const response = await msal.acquireTokenSilent({
      ...tokenScopes,
      account,
    });
    // For CIAM with OIDC scopes, accessToken may be empty — fall back to idToken
    // which carries aud=clientId that our backend validates against
    return response.accessToken || response.idToken || null;
  } catch {
    // Silent acquisition failed — try popup
    try {
      const response = await msal.acquireTokenPopup({
        ...loginScopes,
        account,
      });
      return response.accessToken || response.idToken || null;
    } catch {
      return null;
    }
  }
}

// =============================================================================
// Auth helper: current account
// =============================================================================
export async function getCurrentAccount(): Promise<AccountInfo | null> {
  const msal = await getMsalInstance();
  const accounts = msal.getAllAccounts();
  return accounts[0] || null;
}

// =============================================================================
// Auth helper: is logged in?
// =============================================================================
export async function isAuthenticated(): Promise<boolean> {
  const account = await getCurrentAccount();
  return account !== null;
}

// =============================================================================
// Auth helper: login (popup)
// =============================================================================
export async function loginWithPopup(): Promise<{
  accessToken: string;
  account: AccountInfo;
} | null> {
  const msal = await getMsalInstance();
  try {
    const response = await msal.loginPopup(loginScopes);
    if (!response?.account) return null;
    return {
      accessToken: response.accessToken || response.idToken,
      account:     response.account,
    };
  } catch (error) {
    // Re-throw so the caller (LoginForm) can handle specific MSAL error codes
    throw error;
  }
}

// =============================================================================
// Auth helper: register via signup popup
// =============================================================================
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
    return {
      accessToken: response.accessToken || response.idToken,
      account:     response.account,
    };
  } catch (error) {
    throw error;
  }
}

// =============================================================================
// Auth helper: logout
// =============================================================================
export async function logout(): Promise<void> {
  const msal  = await getMsalInstance();
  const account = await getCurrentAccount();

  await msal.logoutPopup({
    account:              account || undefined,
    postLogoutRedirectUri: '/',
  });
}

// =============================================================================
// API client helper — fetch with Bearer token attached
// =============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const token = await getAccessToken();

  // No token means session expired — redirect to login
  if (!token) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return { error: 'Session expired. Redirecting to login…', status: 401 };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

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

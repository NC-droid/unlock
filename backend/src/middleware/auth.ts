import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// =============================================================================
// Azure Entra External ID JWT verification middleware
// Validates Bearer tokens issued by Azure AD B2C / Entra External ID
// =============================================================================

const tenantId   = process.env.AZURE_TENANT_ID!;
const tenantName = process.env.AZURE_TENANT_NAME!;
const clientId   = process.env.AZURE_CLIENT_ID!;

if (!tenantId || !tenantName || !clientId) {
  throw new Error('Azure auth env vars (AZURE_TENANT_ID, AZURE_TENANT_NAME, AZURE_CLIENT_ID) are required');
}

// Azure Entra External ID JWKS endpoint
// CIAM JWKS is served via tenantName subdomain
const jwksUri = `https://${tenantName}.ciamlogin.com/${tenantId}/discovery/v2.0/keys`;

// CIAM token issuer uses tenantId as subdomain (not tenantName):
// https://{tenantId}.ciamlogin.com/{tenantId}/v2.0
// Verified via: https://{tenantName}.ciamlogin.com/{tenantId}/v2.0/.well-known/openid-configuration
const tokenIssuer = `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`;

const client = jwksClient({
  jwksUri,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600_000, // 10 minutes
});

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// =============================================================================
// Extend Express Request type to include authenticated user
// =============================================================================
export interface AuthenticatedUser {
  azureUserId: string;  // Azure object ID (sub claim)
  email: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// =============================================================================
// requireAuth middleware — validates JWT and attaches user to req.user
// =============================================================================
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Bearer token required',
    });
    return;
  }

  const token = authHeader.slice(7);

  jwt.verify(
    token,
    getSigningKey,
    {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: tokenIssuer,
    },
    (err, decoded) => {
      if (err) {
        console.error('[Auth] JWT verification failed:', err.message);
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      const payload = decoded as Record<string, unknown>;

      req.user = {
        azureUserId: payload.sub as string,
        email: (payload.email as string) || (payload.preferred_username as string) || '',
        name: payload.name as string | undefined,
      };

      next();
    }
  );
}

// =============================================================================
// optionalAuth — attaches user if token present but doesn't block if absent
// =============================================================================
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  jwt.verify(
    token,
    getSigningKey,
    {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: tokenIssuer,
    },
    (err, decoded) => {
      if (!err && decoded) {
        const payload = decoded as Record<string, unknown>;
        req.user = {
          azureUserId: payload.sub as string,
          email: (payload.email as string) || (payload.preferred_username as string) || '',
          name: payload.name as string | undefined,
        };
      }
      next();
    }
  );
}

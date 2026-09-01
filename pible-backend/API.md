# Authentication & Authorization API Documentation

## Overview

The Pible authentication system supports two distinct auth paths that converge into a unified `RequestContext`:

| Auth Method | Header | Actor Type | Use Case |
|-------------|--------|------------|----------|
| JWT (Bearer) | `Authorization: Bearer <token>` | `human` | User sessions via web dashboard |
| API Key | `x-api-key: pk_...` | `agent` | Programmatic access (CI, agents, integrations) |

Both paths resolve to the same `RequestContext` shape, so downstream code never needs to know which auth method was used.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Request                                  │
│                           │                                      │
│         ┌─────────────────┼─────────────────┐                   │
│         ▼                                   ▼                    │
│   JwtAuthGuard                         ApiKeyGuard              │
│   (Bearer token)                       (x-api-key header)       │
│         │                                   │                    │
│         ▼                                   ▼                    │
│   JwtStrategy                         ApiKeyStrategy            │
│   - Verify signature                 - Extract raw key          │
│   - Check expiry                    - Compare bcrypt hash       │
│   - Return RequestContext           - Return RequestContext     │
│         │                                   │                    │
│         └─────────────────┬─────────────────┘                   │
│                           ▼                                      │
│                  request.actor = RequestContext                   │
│                           │                                      │
│                           ▼                                      │
│                  @CurrentActor() decorator                       │
│                  (extracts actor in controllers)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Token Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| Access Token TTL | 15 minutes | Short-lived, limits exposure window |
| Refresh Token TTL | 7 days | Long-lived, enables session persistence |
| bcrypt rounds | 12 | Password hashing cost (≈250ms/hash) |
| API Key format | `pk_<64 hex chars>` | 256-bit entropy, identifiable prefix |

---

## Public Endpoints

### POST `/api/v1/auth/register`

Register a new user account with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SuperSecure123!",
  "displayName": "Jane Dev"
}
```

**Validation:**
- `email`: Valid email format
- `password`: 8-128 characters
- `displayName`: Optional, max 100 characters

**Response (201):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Error Responses:**
- `409 Conflict` — Email already registered, or account exists via OAuth (includes provider name in message)

**Implementation Notes:**
- Normalizes email to lowercase before storage
- If an OAuth-only account exists with the same email, suggests linking instead of creating duplicate
- New users start with empty `projectId` in tokens — must create a first project to access project-scoped endpoints

---

### POST `/api/v1/auth/login`

Authenticate with email and password, receiving a token pair.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SuperSecure123!"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Error Responses:**
- `401 Unauthorized` — Invalid credentials (same message for wrong email OR wrong password to prevent user enumeration)
- `401 Unauthorized` — Account uses OAuth sign-in (includes available providers in message)

**Security Features:**
- Constant-time error messages prevent user enumeration
- OAuth-only accounts cannot use password login
- Resolves user's latest project for the token's `projectId`

---

### POST `/api/v1/auth/refresh`

Exchange a valid refresh token for a new access + refresh token pair.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Error Responses:**
- `401 Unauthorized` — Invalid or expired refresh token
- `401 Unauthorized` — User no longer exists

**Implementation Notes:**
- Verifies refresh token with `JWT_REFRESH_SECRET` (separate from access secret)
- Confirms user still exists in database before issuing new tokens
- Preserves the original `projectId` from the refresh token payload

---

### POST `/api/v1/auth/providers/check`

Check whether signing in with an OAuth provider + email would conflict with an existing account. Used by the frontend during OAuth sign-in flow to determine the correct UX path.

**Request:**
```json
{
  "email": "user@example.com",
  "provider": "github"
}
```

**Response (200):**
```json
{
  "conflict": true,
  "existingProvider": "google",
  "userId": "uuid",
  "message": "An account with this email already exists via google. Please sign in with that method, or link this provider in your account settings."
}
```

**Possible Outcomes:**
| Scenario | `conflict` | Meaning |
|----------|------------|---------|
| No user with email | `false` | Safe to create new account |
| Same provider linked | `false` | Normal returning-user sign-in |
| Different provider linked | `true` | Must prompt user to link accounts |

---

### POST `/api/v1/auth/providers/upsert`

Create a new user from OAuth sign-in, or link provider to existing account. Called by the frontend after successful OAuth callback.

**Request:**
```json
{
  "provider": "github",
  "providerAccountId": "12345678",
  "email": "user@example.com",
  "displayName": "Jane Dev"
}
```

**Response (201):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Flow:**
1. Check if provider account already linked → return existing user's tokens
2. Check if user with same email exists → link provider, return tokens
3. Brand new user → create account with provider link, return tokens

**Error Responses:**
- `409 Conflict` — Provider linked to a different user account

---

## Protected Endpoints (JWT Required)

All endpoints below require `Authorization: Bearer <access_token>` header.

### GET `/api/v1/auth/me`

Returns the resolved `RequestContext` from the current access token. Useful for dashboard to confirm token identity without a full DB call.

**Response (200):**
```json
{
  "projectId": "uuid",
  "actorType": "human",
  "actorId": "uuid"
}
```

---

### GET `/api/v1/auth/providers`

List all OAuth providers linked to the current user's account.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "provider": "github",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### POST `/api/v1/auth/providers/link`

Link a new OAuth provider to the authenticated user's account.

**Request:**
```json
{
  "provider": "google",
  "providerAccountId": "987654321",
  "email": "user@example.com",
  "displayName": "Jane Dev"
}
```

**Response (201):**
```json
{
  "success": true
}
```

**Error Responses:**
- `409 Conflict` — Provider already linked to another user
- `404 Not Found` — User not found (should not happen with valid JWT)

**Idempotency:** If the same provider is already linked to the current user, returns success without error.

---

### DELETE `/api/v1/auth/providers/:providerId`

Unlink a provider from the current account.

**Response (204:** No content

**Error Responses:**
- `404 Not Found` — Provider not found on this account
- `409 Conflict` — Cannot remove the only sign-in method (must set password or link another provider first)

---

## API Key Management

API keys provide programmatic access scoped to a specific project. The raw key is returned **only once** at minting time.

### POST `/api/v1/projects/:projectId/api-keys`

Mint a new API key for a project.

**Request:**
```json
{
  "label": "cursor-agent"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "label": "cursor-agent",
  "rawKey": "pk_a1b2c3d4e5f6...",
  "projectId": "uuid",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Security:**
- Raw key is 256-bit cryptographically random (32 bytes hex-encoded with `pk_` prefix)
- Only the bcrypt hash is stored in database
- `label` is optional, max 100 characters (human-readable identifier)

---

### GET `/api/v1/projects/:projectId/api-keys`

List active (non-revoked) API keys for a project.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "label": "cursor-agent",
    "lastUsedAt": "2024-01-15T12:00:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

**Note:** `keyHash` is never included in responses.

---

### DELETE `/api/v1/projects/:projectId/api-keys/:keyId`

Revoke an API key. Idempotent — already-revoked keys return 404.

**Response (204:** No content

**Error Responses:**
- `404 Not Found` — Key not found or already revoked

---

## Request Context

Both auth paths resolve to a unified `RequestContext`:

```typescript
interface RequestContext {
  projectId: string;        // The project this request acts upon
  actorType: 'human' | 'agent';  // Which auth path was used
  actorId: string;          // User.id (human) or ApiKey.id (agent) — never raw key
}
```

**Design Rules:**
- `projectId` comes from the key record itself (for API keys) — never from request body. A key is minted for one project and cannot be redirected at request time.
- The raw API key is never stored or logged — only the bcrypt hash.
- `last_used_at` updates are fire-and-forget (no `await`) so they never block the request path.

---

## Security Considerations

### Token Handling
- Access tokens are short-lived (15 min) to limit exposure window
- Refresh tokens use a separate secret (`JWT_REFRESH_SECRET` ≠ `JWT_ACCESS_SECRET`)
- Expired tokens are never silently passed through (`ignoreExpiration: false`)

### Password Security
- bcrypt with 12 rounds (≈250ms per hash on modern hardware)
- Minimum 8 character requirement enforced at DTO level
- OAuth-only accounts have `passwordHash: null` and cannot use password login

### User Enumeration Prevention
- Login returns identical error messages for "email not found" and "wrong password"
- OAuth conflict checking is a separate explicit step, not leaked through login

### API Key Safety
- Raw keys are never stored — only bcrypt hashes
- Raw keys are never returned after minting (only `pk_`-prefixed format shown once)
- Keys are scoped to a single project at minting time
- Revocation is immediate and permanent

---

## Production & Scalability Notes

### Current Limitations & Future Improvements

| Area | Current State | Production Scaling Path |
|------|---------------|------------------------|
| **Refresh Tokens** | Stateless (JWT only) | Implement refresh token rotation with server-side storage for instant revocation |
| **API Key Lookup** | Linear scan of active keys | Add `key_prefix` column (first 8 chars) for indexed lookup; reduces O(n) to O(1) |
| **Rate Limiting** | None | Add rate limiting per-IP on auth endpoints (login, register, refresh) to prevent brute force |
| **Token Revocation** | Not supported | For logout: maintain a token blocklist (Redis) with TTL matching token expiry |
| **Session Management** | None | Add endpoint to list/revoke active sessions for user dashboard |
| **OAuth Providers** | Frontend-driven | Consider server-side OAuth flow with PKCE for enhanced security |
| **Audit Logging** | None | Log auth events (login, register, key mint/revoke) to audit table |
| **MFA** | Not supported | Add TOTP-based multi-factor authentication |
| **Password Reset** | Not supported | Implement secure password reset via email tokens |

### Database Indexes Recommended

```sql
-- User lookups by email
CREATE UNIQUE INDEX idx_user_email ON "User"(email);

-- Provider link lookups
CREATE UNIQUE INDEX idx_provider_account
  ON "UserProvider"(provider, provider_account_id);

-- API key prefix lookup (when key_prefix column added)
CREATE INDEX idx_api_key_prefix ON "ApiKey"(key_prefix) WHERE revoked_at IS NULL;

-- User's active API keys
CREATE INDEX idx_api_key_active
  ON "ApiKey"(project_id, user_id) WHERE revoked_at IS NULL;
```

### Horizontal Scaling

The auth system is stateless (JWT-based) which enables horizontal scaling:
- No server-side session state to synchronize
- All NestJS instances validate tokens independently using shared secrets
- Database is the only shared state — ensure connection pooling (Prisma) is configured

**For multi-region deployment:**
- Share `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` across all instances (via secrets manager)
- Use a distributed cache (Redis) if implementing token blocklist
- Database read replicas can serve token validation queries (user existence checks)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_ACCESS_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens |
| `ENABLE_SWAGGER` | No | Set to `true` to enable Swagger docs (non-production only) |

---

## Swagger Documentation

When `ENABLE_SWAGGER=true` and `NODE_ENV !== 'production'`, interactive API documentation is available at:

```
GET /api/v1/docs
```

All auth endpoints are tagged under `Auth` with full request/response schemas.

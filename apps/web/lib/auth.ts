import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

export type AuthSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken: string;
  refreshToken?: string;
  expires: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Check with the backend if signing in with this provider + email would
 * conflict with an existing account.
 */
async function checkProviderConflict(
  email: string,
  provider: string,
): Promise<{ conflict: boolean; message?: string }> {
  if (!API_URL) {
    return { conflict: false };
  }

  try {
    const res = await fetch(`${API_URL}/auth/providers/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, provider }),
    });

    if (!res.ok) {
      return { conflict: false };
    }

    const data = await res.json();
    return {
      conflict: data.conflict ?? false,
      message: data.message,
    };
  } catch {
    // If the check fails, allow sign-in to proceed (fail open)
    return { conflict: false };
  }
}

/**
 * Tell the backend to create or link the OAuth user after successful sign-in.
 */
async function upsertOAuthUser(params: {
  provider: string;
  providerAccountId: string;
  email: string;
  displayName?: string;
}): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!API_URL) {
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/auth/providers/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    return null;
  }
}

export const authOptions = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    Google({
      clientId: process.env.GOOGLE_ID ?? "",
      clientSecret: process.env.GOOGLE_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * signIn callback: runs after OAuth provider returns but before session
     * is created. We use this to detect email conflicts across providers.
     */
    async signIn({
      user,
      account,
    }: {
      user: any;
      account: any;
      profile?: any;
    }): Promise<boolean | string> {
      // Only check for OAuth providers (not email/password)
      if (!account || !user.email) {
        return true;
      }

      const { conflict, message } = await checkProviderConflict(
        user.email,
        account.provider,
      );

      if (conflict) {
        // Return a URL-encoded error message that will be shown on the
        // login page via the ?error= query param
        const encodedMessage = encodeURIComponent(
          message ??
            `An account with this email already exists via a different sign-in method. Please use that method to sign in.`,
        );
        return `/login?error=provider_conflict&message=${encodedMessage}`;
      }

      return true;
    },

    async jwt({
      token,
      account,
      profile,
      trigger,
    }: {
      token: any;
      account?: any;
      profile?: any;
      trigger?: string;
    }) {
      // Initial sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.providerId = account.providerAccountId;

        if (profile?.email) {
          token.email = profile.email;
        }
        if (profile?.name) {
          token.name = profile.name;
        }
        if (profile?.image) {
          token.image = profile.image;
        }

        // Sync with backend: create/link user and get backend tokens
        if (account.provider && account.providerAccountId && token.email) {
          const backendTokens = await upsertOAuthUser({
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            email: token.email,
            displayName: token.name,
          });

          if (backendTokens) {
            token.backendAccessToken = backendTokens.accessToken;
            token.backendRefreshToken = backendTokens.refreshToken;
          }
        }
      }

      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.provider = token.provider as string;
      session.providerId = token.providerId as string;
      session.backendAccessToken = token.backendAccessToken as string;
      session.backendRefreshToken = token.backendRefreshToken as string;
      session.user.id = token.sub as string;
      return session;
    },
  },
};

export const handler = NextAuth(authOptions);

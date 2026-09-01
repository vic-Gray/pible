import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

export type BackendTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken: string;
  refreshToken?: string;
  backendTokens?: BackendTokens;
  provider?: string;
  providerId?: string;
  expires: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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
    return { conflict: false };
  }
}

async function upsertOAuthUser(params: {
  provider: string;
  providerAccountId: string;
  email: string;
  displayName?: string;
  image?: string;
}): Promise<BackendTokens | null> {
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
    maxAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({
      user,
      account,
    }: {
      user: any;
      account: any;
    }): Promise<boolean | string> {
      if (!account?.provider || !user?.email) {
        return true;
      }

      const { conflict, message } = await checkProviderConflict(
        user.email,
        account.provider,
      );

      if (conflict) {
        const encodedMessage = encodeURIComponent(
          message ??
            "An account with this email already exists via a different sign-in method. Please use that method to sign in.",
        );
        return `/login?error=provider_conflict&message=${encodedMessage}`;
      }

      return true;
    },

    async jwt({
      token,
      account,
      profile,
    }: {
      token: any;
      account?: any;
      profile?: any;
    }) {
      if (account) {
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

        if (account.provider && account.providerAccountId && token.email) {
          const backendTokens = await upsertOAuthUser({
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            email: token.email,
            displayName: token.name,
            image: token.image as string | undefined,
          });

          if (backendTokens) {
            token.backendTokens = backendTokens;
          }
        }
      }

      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      session.backendTokens = token.backendTokens as BackendTokens | undefined;
      session.provider = token.provider as string | undefined;
      session.providerId = token.providerId as string | undefined;
      session.user.id = token.sub as string;
      return session;
    },
  },
};

export const handler = NextAuth(authOptions);

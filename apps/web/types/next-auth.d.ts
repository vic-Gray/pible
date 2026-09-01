import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    backendTokens?: {
      accessToken: string;
      refreshToken: string;
    };
    provider?: string;
    providerId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendTokens?: {
      accessToken: string;
      refreshToken: string;
    };
    provider?: string;
    providerId?: string;
  }
}

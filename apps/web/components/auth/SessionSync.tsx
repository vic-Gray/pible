"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

const ACCESS_KEY = "pible_access_token";
const REFRESH_KEY = "pible_refresh_token";

export function SessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.backendTokens) {
      return;
    }

    const { accessToken, refreshToken } = session.backendTokens;

    if (accessToken) {
      localStorage.setItem(ACCESS_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
  }, [session, status]);

  return null;
}

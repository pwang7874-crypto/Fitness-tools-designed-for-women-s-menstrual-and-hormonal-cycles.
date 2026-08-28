"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Profile } from "@/lib/api";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await api.session();
      setProfile(current);
      localStorage.setItem("profile_id", String(current.profile_id));
    } catch (reason) {
      if (!(reason instanceof ApiError && reason.code === "http_401")) {
        setError(reason instanceof ApiError ? reason.userMessage : "无法读取档案");
      }
      setProfile(null);
      localStorage.removeItem("profile_id");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, error, refresh };
}

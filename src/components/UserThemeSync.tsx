import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Isolates theme preference per authenticated user.
 * Each user account has its own theme stored in localStorage under `theme:<userId>`.
 * When a user logs in, we apply their saved theme. When they change it,
 * we persist under their per-user key so other accounts on the same device
 * are not affected.
 */
const UserThemeSync = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // When user changes (login/logout), apply their saved theme
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(`theme:${user.id}`);
      if (saved && saved !== theme) {
        setTheme(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // When theme changes while logged in, persist per-user
  useEffect(() => {
    if (!user || !theme) return;
    try {
      localStorage.setItem(`theme:${user.id}`, theme);
    } catch {}
  }, [theme, user?.id]);

  return null;
};

export default UserThemeSync;

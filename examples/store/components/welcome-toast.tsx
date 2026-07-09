"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function WelcomeToast() {
  useEffect(() => {
    if (window.innerHeight < 650) return;
    if (!document.cookie.includes("welcome-toast=2")) {
      toast("Welcome to FiberFlow Store!", {
        id: "welcome-toast",
        duration: Infinity,
        onDismiss: () => {
          document.cookie = "welcome-toast=2; max-age=31536000; path=/";
        },
        description: (
          <>
            This demo storefront runs on Next.js, Neon Postgres, and Drizzle —
            no Shopify required.
          </>
        ),
      });
    }
  }, []);

  return null;
}

import { createMiddleware } from "@tanstack/react-start";

// Keep Supabase out of the initial browser bundle. Load it only when a
// client-side server-function call actually needs to attach the user's token.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { supabase } = await import("./client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);

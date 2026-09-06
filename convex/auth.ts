import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Convex Auth — source of truth for product-path identity on convex.site.
 * Password provider; JWT keys live only in the Convex dashboard (never in git).
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();
        const nameRaw = params.name;
        const name =
          typeof nameRaw === "string" && nameRaw.trim()
            ? nameRaw.trim()
            : undefined;
        return name ? { email, name } : { email };
      },
    }),
  ],
});

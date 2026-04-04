import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Anonymous,
    Google({}),
  ],
});

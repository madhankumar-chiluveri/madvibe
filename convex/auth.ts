import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";
import {
  PERSISTENT_AUTH_INACTIVE_DURATION_MS,
  PERSISTENT_AUTH_TOTAL_DURATION_MS,
} from "../shared/auth-session";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  session: {
    totalDurationMs: PERSISTENT_AUTH_TOTAL_DURATION_MS,
    inactiveDurationMs: PERSISTENT_AUTH_INACTIVE_DURATION_MS,
  },
  providers: [
    Password,
    Anonymous,
    Google({}),
  ],
});

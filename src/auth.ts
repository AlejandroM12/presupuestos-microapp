import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/domain/auth";
import { verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { clientIp, RateLimiter } from "@/server/rate-limit";

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}
export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

const perAccount = new RateLimiter(8, 15 * 60_000);
const perIp = new RateLimiter(40, 15 * 60_000);

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: THIRTY_DAYS },
  pages: { signIn: "/ingresar" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidCredentialsError();
        const { email, password } = parsed.data;

        const ip = clientIp(request.headers);
        if (!perIp.check(ip).allowed || !perAccount.check(`${ip}|${email}`).allowed) {
          throw new RateLimitedError();
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          await verifyAgainstDummy(password);
          throw new InvalidCredentialsError();
        }
        if (!(await verifyPassword(user.passwordHash, password))) {
          throw new InvalidCredentialsError();
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const uid = typeof token.uid === "string" ? token.uid : undefined;
      if (user) {
        token.uid = user.id;
        token.sv = user.sessionVersion ?? 0;
        return token;
      }
      // Revalida contra la base: una cuenta borrada o un cambio de contraseña cierra la sesión.
      if (!uid) return null;
      const current = await db.user.findUnique({
        where: { id: uid },
        select: { sessionVersion: true },
      });
      if (!current || current.sessionVersion !== token.sv) return null;
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});

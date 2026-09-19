import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { encode as defaultEncode } from "next-auth/jwt";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

// "Remember me" unchecked keeps a session alive for a day; checked, 30
// days. This is enforced by the JWT's own `exp` claim (set in the custom
// `jwt.encode` below), not just cookie lifetime, so it holds even if a
// browser is configured to keep cookies indefinitely.
const SHORT_SESSION_SECONDS = 60 * 60 * 24; // 1 day
const LONG_SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Session strategy: JWT, not database sessions.
 *
 * The data model in Section 07 has no Session/Account/VerificationToken
 * table - only User, scoped to a Workspace. A Credentials provider with JWT
 * sessions needs no Prisma adapter at all, which is the only session
 * strategy consistent with that schema. Role and workspaceId are embedded
 * in the token at sign-in so every subsequent request can be authorized
 * without a database round trip.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: LONG_SESSION_SECONDS },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "text" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const passwordMatches = await compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
          rememberMe: rawCredentials?.rememberMe === "true",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on initial sign-in; on subsequent requests
      // we carry forward what's already in the token.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
        token.rememberMe = user.rememberMe;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.workspaceId = token.workspaceId;
      }
      return session;
    },
  },
  jwt: {
    // NextAuth's default encode always uses the static `session.maxAge`
    // above. Overriding it to branch on the per-sign-in `rememberMe` flag
    // is the documented way to vary JWT lifetime per user rather than per
    // deployment - see the constants' comment for what each value means.
    async encode(params) {
      const maxAge =
        params.token?.rememberMe === false ? SHORT_SESSION_SECONDS : LONG_SESSION_SECONDS;
      return defaultEncode({ ...params, maxAge });
    },
  },
};

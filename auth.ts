import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { ensureDemoAdminUser, ensureDemoUser } from "@/lib/authz";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM
    }),
    CredentialsProvider({
      id: "demo",
      name: "Demo Login",
      credentials: {
        role: { label: "Role", type: "text" }
      },
      async authorize(credentials) {
        if (process.env.DEMO_LOGIN_ENABLED === "false") {
          return null;
        }

        const user = credentials?.role === "admin" ? await ensureDemoAdminUser() : await ensureDemoUser();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        };
      }
    })
  ],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = token.role;
        session.user.status = token.status;
      }

      return session;
    }
  }
};

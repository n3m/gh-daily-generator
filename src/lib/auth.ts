import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email read:org repo",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Fetch the access token from the Account table
      const account = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: "github",
        },
        select: {
          access_token: true,
        },
      });

      if (account?.access_token) {
        session.accessToken = account.access_token;
      }

      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

// Extend the session type
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

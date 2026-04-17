import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnLogin = nextUrl.pathname.startsWith("/login")

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }
        return true
      }

      return isLoggedIn
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { authConfig } from "@/auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Lozinka", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) return null
        if (!user.active) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Pri prijavi je pristup vec proveren u authorize()/signIn().
      if (user) {
        token.role = user.role
        token.id = user.id
        return token
      }

      const userId = (token.id ?? token.sub) as string | undefined
      if (!userId) return null

      // Svaki naredni poziv auth() proverava da nalog i dalje ima pristup.
      // Vracanje null gasi sesiju: auth() vraca null, pa straza u
      // (dashboard)/layout.tsx i u server akcijama odbija zahtev.
      try {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: { active: true, role: true, name: true },
        })

        if (!dbUser || !dbUser.active) return null

        // Promena role vazi odmah, bez ponovne prijave.
        token.id = userId
        token.role = dbUser.role
        token.name = dbUser.name
      } catch (err) {
        // Baza nedostupna — zadrzi sesiju. Odjaviti sve zbog kratkog prekida
        // baze bilo bi gore od nekoliko sekundi zastarelog pristupa.
        console.error("[auth] provera pristupa nije uspela", err)
      }

      return token
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false
        const dbUser = await db.user.findUnique({
          where: { email: user.email.toLowerCase() },
        })
        if (!dbUser || !dbUser.active) return false
        user.id = dbUser.id
        user.role = dbUser.role
        user.name = dbUser.name
      }
      if (user.id) {
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
      }
      return true
    },
  },
})

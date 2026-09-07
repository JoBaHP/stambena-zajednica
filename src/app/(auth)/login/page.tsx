"use client"

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Building2 } from "lucide-react"
import Link from "next/link"

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get("error")
    const odjava = params.get("odjava")
    if (!error && !odjava) return

    const id = setTimeout(() => {
      if (odjava === "pristup") {
        toast.error(
          "Приступ твом налогу је уклоњен. Обрати се управнику.",
          { duration: 8000 },
        )
      } else if (error === "AccessDenied" || error === "Callback") {
        toast.error(
          "Твој Google налог није регистрован у систему. Обрати се управнику.",
          { duration: 6000 },
        )
      } else {
        toast.error(`Пријава није успела (${error}). Покушај поново.`, {
          duration: 6000,
        })
      }
    }, 100)

    params.delete("error")
    params.delete("odjava")
    const newQs = params.toString()
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${newQs ? `?${newQs}` : ""}`,
    )

    return () => clearTimeout(id)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      toast.error("Погрешни подаци за пријаву")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  function handleGoogleSignIn() {
    setGoogleLoading(true)
    signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-indigo-700 shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Пастерова 16</h1>
          <p className="text-sm text-muted-foreground mt-1">Стамбена заједница</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Пријава</CardTitle>
            <CardDescription>Унесите ваш емаил и лозинку</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Емаил</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vas@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Лозинка</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Пријављивање..." : "Пријави се"}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">или</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? "Преусмеравање..." : "Пријави се са Google налогом"}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Google пријава ради само ако твој Google емаил одговара оном који је управник унео у систем.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Nemas nalog?{" "}
          <Link
            href="/login/zatrazi-pristup"
            className="text-primary font-medium underline underline-offset-4 hover:no-underline"
          >
            Затражи приступ
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-8">
          ©{" "}
          <a
            href="https://github.com/JoBaHP"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Jovan Raosavljevic
          </a>
        </p>
      </div>
    </div>
  )
}

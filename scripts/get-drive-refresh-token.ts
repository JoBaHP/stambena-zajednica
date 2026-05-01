import { google } from "googleapis"
import http from "node:http"
import { URL } from "node:url"
import { exec } from "node:child_process"
import "dotenv/config"

const SCOPES = ["https://www.googleapis.com/auth/drive"]
const PORT = 53682
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`

async function main() {
  const clientId = process.env.GDRIVE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GDRIVE_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error(
      "Postavi GDRIVE_OAUTH_CLIENT_ID i GDRIVE_OAUTH_CLIENT_SECRET u .env",
    )
    process.exit(1)
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  })

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) return
      const url = new URL(req.url, `http://localhost:${PORT}`)
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404).end()
        return
      }
      const c = url.searchParams.get("code")
      const err = url.searchParams.get("error")
      if (err) {
        res.writeHead(400, { "Content-Type": "text/plain" })
        res.end(`Greska: ${err}`)
        server.close()
        reject(new Error(err))
        return
      }
      if (!c) {
        res.writeHead(400).end()
        return
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      res.end(
        "<h2>Gotovo</h2><p>Mozes zatvoriti ovaj tab i vratiti se u terminal.</p>",
      )
      server.close()
      resolve(c)
    })
    server.listen(PORT, () => {
      console.log(`\nOtvaram browser:\n${authUrl}\n`)
      const opener =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open"
      exec(`${opener} "${authUrl}"`)
    })
  })

  const { tokens } = await oauth2.getToken(code)
  if (!tokens.refresh_token) {
    console.error(
      "\nNema refresh_token. Idi na https://myaccount.google.com/permissions, ukloni pristup za ovu app i pokreni skriptu ponovo.",
    )
    process.exit(1)
  }

  console.log("\n=== DODAJ U .env ===\n")
  console.log(`GDRIVE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`)
  console.log("\n====================\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

import Groq from "groq-sdk"

const MODEL = "llama-3.3-70b-versatile"

const PROMPT =
  "Napravi sažetak ove ponude na srpskom jeziku. Izvuci ključne informacije: predmet ponude, cenu, uslove, rokove isporuke, garancije. Budi koncizan, maksimalno 150 reči."

export async function summarizeOffer(opts: {
  mimeType: string
  buffer: Buffer
}): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  try {
    const text = await extractText(opts.mimeType, opts.buffer)
    if (!text || text.trim().length < 30) return null

    const client = new Groq({ apiKey })
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        { role: "user", content: `${PROMPT}\n\n${text.slice(0, 12000)}` },
      ],
    })

    return response.choices[0]?.message?.content ?? null
  } catch (err) {
    console.error("[ai-summary] greška:", err)
    return null
  }
}

async function extractText(mimeType: string, buffer: Buffer): Promise<string> {
  if (mimeType === "application/pdf") {
    const { getDocumentProxy, extractText } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    return text
  }

  const DOCX =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  const DOC = "application/msword"
  if (mimeType === DOCX || mimeType === DOC) {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  const XLSX =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  const XLS = "application/vnd.ms-excel"
  if (mimeType === XLSX || mimeType === XLS) {
    const xlsxLib = await import("xlsx")
    const wb = xlsxLib.read(buffer, { type: "buffer" })
    return wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name]
      return `[${name}]\n${xlsxLib.utils.sheet_to_csv(ws)}`
    }).join("\n\n")
  }

  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/xml" ||
    mimeType === "text/xml"
  ) {
    return buffer.toString("utf-8")
  }

  return ""
}

import Anthropic from "@anthropic-ai/sdk"

export async function summarizeOffer(opts: {
  mimeType: string
  buffer: Buffer
}): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })
  const prompt =
    "Napravi sažetak ove ponude na srpskom jeziku. Izvuci ključne informacije: predmet ponude, cenu, uslove, rokove isporuke, garancije. Budi koncizan, maksimalno 150 reči."

  try {
    let content: Anthropic.MessageParam["content"]

    if (opts.mimeType === "application/pdf") {
      content = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: opts.buffer.toString("base64"),
          },
        } as Anthropic.DocumentBlockParam,
        { type: "text", text: prompt },
      ]
    } else {
      const text = await extractText(opts.mimeType, opts.buffer)
      if (!text || text.trim().length < 30) return null
      content = `${prompt}\n\n${text.slice(0, 12000)}`
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content }],
    })

    const block = response.content.find((b) => b.type === "text")
    return block?.type === "text" ? block.text : null
  } catch (err) {
    console.error("[ai-summary] greška:", err)
    return null
  }
}

async function extractText(mimeType: string, buffer: Buffer): Promise<string> {
  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  const DOC = "application/msword"
  const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  const XLS = "application/vnd.ms-excel"

  if (mimeType === DOCX || mimeType === DOC) {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

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

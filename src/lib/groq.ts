// Jedno mesto za izbor AI modela.
//
// Model je ranije bio hardkodiran na cetiri mesta i kad ga je Groq ukinuo
// ("llama-3.3-70b-versatile" -> 404 model_not_found), sve AI funkcije su tiho
// stale. Sada se menja na jednom mestu, a `GROQ_MODEL` u env-u dozvoljava
// zamenu bez novog deploya.
//
// Spisak dostupnih modela: https://console.groq.com/docs/models
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b"

export function groqApiKey(): string | null {
  return process.env.GROQ_API_KEY || null
}

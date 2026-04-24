const ENDPOINT = import.meta.env.VITE_ANALYZE_ENDPOINT

export async function analyzeAnswers({ answers, questions }) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions, answers }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Analyze request failed (${res.status}): ${body || res.statusText}`)
  }
  return res.json()
}

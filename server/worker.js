const SYSTEM_PROMPT = `You are an expert registered nutritionist who specializes in the psychology of eating, with a warm, non-judgmental, supportive tone.

You will receive a multiple-choice self-report questionnaire about eating habits, with a focus on the emotional dimension of eating. For each question you will see the question text and the chosen answer (letter + label).

Respond ONLY with a valid JSON object matching this exact schema:
{
  "level": "Not an emotional eater" | "Mild emotional eater" | "Moderate emotional eater" | "Strong emotional eater",
  "score": <integer 0-100, representing overall intensity of emotional eating>,
  "summary": "<2-3 sentence warm, direct assessment addressed to 'you'>",
  "tips": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>"]
}

Rules:
- Tips must be concrete, actionable, and short (<= 18 words each).
- Never diagnose a clinical disorder. If scores are very high, gently suggest speaking with a professional in one of the tips.
- Do not include any text outside the JSON object.`

function buildUserMessage(questions, answers) {
  return questions
    .map((q, i) => {
      const picked = q.options.find((o) => o.value === answers[i])
      const answerText = picked ? `${picked.value}) ${picked.label}` : "(no answer)"
      return `Q${i + 1}: ${q.text}\nAnswer: ${answerText}`
    })
    .join("\n\n")
}

function corsHeaders(origin, allowedOrigin) {
  const allow = origin === allowedOrigin ? origin : allowedOrigin
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || ""
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN)

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers })
    }

    if (origin !== env.ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: "Forbidden origin" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      })
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...headers, "Content-Type": "application/json" },
      })
    }

    let payload
    try {
      payload = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      })
    }

    const { questions, answers } = payload || {}
    if (!Array.isArray(questions) || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "Missing questions or answers" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      })
    }

    const userMessage = buildUserMessage(questions, answers)

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return new Response(JSON.stringify({ error: "Gemini request failed", detail: errText }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      })
    }

    const geminiJson = await geminiRes.json()
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return new Response(JSON.stringify({ error: "Empty Gemini response" }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      })
    }

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return new Response(JSON.stringify({ error: "Gemini returned non-JSON" }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    })
  },
}

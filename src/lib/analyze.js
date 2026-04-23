import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai"

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

async function analyzeWithOpenAI({ apiKey, userMessage }) {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty response from OpenAI")
  return JSON.parse(content)
}

async function analyzeWithGemini({ apiKey, userMessage }) {
  const client = new GoogleGenAI({ apiKey })
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  })
  const content = response.text
  if (!content) throw new Error("Empty response from Gemini")
  return JSON.parse(content)
}

export async function analyzeAnswers({ provider, apiKey, answers, questions }) {
  const userMessage = buildUserMessage(questions, answers)
  if (provider === "gemini") return analyzeWithGemini({ apiKey, userMessage })
  return analyzeWithOpenAI({ apiKey, userMessage })
}

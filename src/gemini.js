// gemini.js - Gemini API Integration Layer for SSE Code Review Streaming
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-3.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`

// Constructs the structured prompt enforcing strict JSON output schemas
function buildPrompt(code, language) {
  return `You are a senior software engineer doing a thorough code review.
Analyse the following ${language} code and return a JSON object — nothing else, no markdown, no explanation outside the JSON.

The JSON must follow this exact schema:
{
  "healthScore": <integer 0-100>,
  "summary": "<2 sentence overall assessment>",
  "categories": {
    "bugs": [
      {
        "severity": "critical" | "warning" | "info",
        "title": "<short title>",
        "description": "<what the problem is>",
        "fix": "<concrete suggestion to fix it>"
      }
    ],
    "performance": [ ...same shape... ],
    "security": [ ...same shape... ],
    "accessibility": [ ...same shape... ],
    "bestPractices": [ ...same shape... ]
  }
}

Rules:
- healthScore: start at 100, deduct 15 per critical issue, 7 per warning, 2 per info
- Each category must be an array — empty array [] if no issues found
- severity must be exactly one of: "critical", "warning", "info"
- fix must be a concrete code suggestion or action, not vague advice
- Do not wrap the response in markdown code fences
- Return only the raw JSON object

Code to review:
\`\`\`${language}
${code}
\`\`\``
}

// Establishes Server-Sent Events (SSE) connection to stream generative AI responses
export async function reviewCode({ code, language, onChunk, onDone, onError }) {
  if (!API_KEY) {
    onError('API key is missing. Check your .env file.')
    return
  }

  if (!code.trim()) {
    onError('No code provided.')
    return
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(code, language) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = err?.error?.message || `API error ${response.status}`
      onError(msg)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const raw = decoder.decode(value, { stream: true })
      const lines = raw.split('\n')
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        const jsonStr = line.slice(6).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        try {
          const parsed = JSON.parse(jsonStr)
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) onChunk(text)
        } catch {
          // Skip partial JSON chunks across buffer boundaries and await completion
        }
      }
    }

    onDone()
  } catch (err) {
    if (err.name === 'AbortError') return
    onError(err.message || 'Network error. Check your connection.')
  }
}

// Parses accumulated raw text into validated dashboard JSON objects
export function parseReview(rawText) {
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    if (
      typeof parsed.healthScore !== 'number' ||
      !parsed.categories ||
      !Array.isArray(parsed.categories.bugs)
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}
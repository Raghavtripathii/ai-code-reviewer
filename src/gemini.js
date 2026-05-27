// Handles all Gemini API communication — prompt engineering, streaming, parsing.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL   = 'gemini-3.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`

const LANGUAGE_NAMES = {
  javascript:  'JavaScript',
  typescript:  'TypeScript',
  python:      'Python',
  java:        'Java',
  go:          'Go',
  rust:        'Rust',
  cpp:         'C++',
  c:           'C',
  csharp:      'C#',
  ruby:        'Ruby',
  php:         'PHP',
  swift:       'Swift',
  kotlin:      'Kotlin',
  html:        'HTML',
  css:         'CSS',
  react:       'React (JSX)',
  tailwind:    'Tailwind CSS',
  nodejs:      'Node.js',
  postgresql:  'PostgreSQL',
  mysql:       'MySQL',
  mongodb:     'MongoDB (NoSQL)',
  graphql:     'GraphQL',
  bash:        'Bash/Shell',
  dart:        'Dart',
  scala:       'Scala',
}

function getLangName(key) {
  return LANGUAGE_NAMES[key] || key
}

function buildPrompt(code, langKey) {
  const langName = getLangName(langKey)

  return `You are a senior software engineer performing a thorough code review.

Analyse the ${langName} code below and respond with ONLY a raw JSON object.
Do not use markdown. Do not use code fences. Do not add any explanation outside the JSON.
Start your response with { and end with }

Required JSON structure:
{
  "healthScore": <integer from 0 to 100>,
  "summary": "<2 sentences summarising the overall quality and main concerns>",
  "categories": {
    "bugs": [
      {
        "severity": "<critical|warning|info>",
        "title": "<short descriptive title>",
        "description": "<clear explanation of the problem>",
        "fix": "<concrete actionable fix — include a short code snippet if helpful>"
      }
    ],
    "performance": [],
    "security": [],
    "accessibility": [],
    "bestPractices": []
  }
}

Scoring rules:
- Start at 100
- Subtract 15 for each critical issue
- Subtract 7 for each warning
- Subtract 2 for each info
- Minimum score is 0

Requirements:
- Every category must be present as an array (empty array if no issues)
- severity must be exactly one of: critical, warning, info
- If the code has no issues in a category, return an empty array for that category
- The fix field must be specific and actionable, not vague advice like "improve this"
- Do not wrap your response in markdown or code fences under any circumstances

${langName} code to review:
\`\`\`
${code.slice(0, 8000)}
\`\`\`

Respond with raw JSON only. Begin your response with {`
}

export async function reviewCode({ code, language, onChunk, onDone, onError }) {
  if (!API_KEY) {
    onError('API key missing — check your .env file.')
    return
  }

  if (!code.trim()) {
    onError('No code to review.')
    return
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: buildPrompt(code, language) }],
        }],
        generationConfig: {
          temperature:      0.1,
          maxOutputTokens:  8192,
          topP:             0.8,
          topK:             10,
        },
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const msg  = body?.error?.message || `API error ${res.status}`

      if (res.status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('demand')) {
        onError('Rate limit reached — Gemini is busy. Wait 30 seconds and try again.')
        return
      }

      onError(msg)
      return
    }

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let   buffer  = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE lines only — buffer incomplete ones
      const lines = buffer.split('\n')
      buffer = lines.pop() 
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        try {
          const parsed = JSON.parse(jsonStr)
          const text   = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) onChunk(text)
        } catch {
          // Skip partial JSON chunks acros buffer boundaries and await completion
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6).trim()
      try {
        const parsed = JSON.parse(jsonStr)
        const text   = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) onChunk(text)
      } catch { /* ignore */ }
    }

    onDone()
  } catch (err) {
    if (err.name === 'AbortError') return
    onError('Network error — check your connection and try again.')
  }
}

export function parseReview(rawText) {
  if (!rawText?.trim()) return null

  try {
    let cleaned = rawText.trim()

    
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

    const start = cleaned.indexOf('{')
    const end   = cleaned.lastIndexOf('}')

    if (start === -1 || end === -1) return null

    cleaned = cleaned.slice(start, end + 1)

    const parsed = JSON.parse(cleaned)

    if (typeof parsed.healthScore !== 'number') return null
    if (typeof parsed.summary     !== 'string') return null
    if (!parsed.categories)                     return null

    const cats = ['bugs', 'performance', 'security', 'accessibility', 'bestPractices']
    cats.forEach(cat => {
      if (!Array.isArray(parsed.categories[cat])) {
        parsed.categories[cat] = []
      }
    })

    parsed.healthScore = Math.max(0, Math.min(100, Math.round(parsed.healthScore)))

    return parsed
  } catch {
    return null
  }
}
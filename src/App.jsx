import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { reviewCode, parseReview } from './gemini.js'
import ReviewPanel from './components/ReviewPanel.jsx'

// Example snippets — these appear as quick-load buttons on the editor
// Each one has a deliberately interesting bug so the review is always impressive
const EXAMPLES = [
  {
    label: 'SQL Injection',
    language: 'javascript',
    code: `async function getUser(id) {
  const query = "SELECT * FROM users WHERE id = " + id
  const result = await db.execute(query)
  return result.rows[0]
}`,
  },
  {
    label: 'React anti-patterns',
    language: 'javascript',
    code: `import { useEffect, useState } from 'react'

function UserList() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => setUsers(data))
  })

  return (
    <ul>
      {users.map(user => (
        <li>{user.name}</li>
      ))}
    </ul>
  )
}`,
  },
  {
    label: 'Memory leak',
    language: 'javascript',
    code: `function trackClicks() {
  const buttons = document.querySelectorAll('button')
  const handlers = []

  buttons.forEach(btn => {
    const handler = () => {
      console.log('clicked', btn.id)
      fetch('/api/track', { method: 'POST', body: btn.id })
    }
    btn.addEventListener('click', handler)
    handlers.push(handler)
  })
}

setInterval(trackClicks, 5000)`,
  },
  {
    label: 'CSS specificity mess',
    language: 'css',
    code: `#app #main .container div.card p.text span {
  color: red !important;
  font-size: 14px !important;
}

* {
  box-sizing: content-box !important;
}

.button {
  background: #fff;
  background: #fff;
  color: #000;
  color: #000;
}`,
  },
]

const LANGUAGES = [
  // backend & systems
  'javascript', 'typescript', 'python', 'java', 'go',
  'rust', 'cpp', 'c', 'csharp', 'ruby', 'php', 'swift', 'kotlin',
  // frontend
  'html', 'css', 'react', 'tailwind',
  // runtime & databases
  'nodejs', 'postgresql', 'mysql', 'mongodb', 'graphql',
]

export default function App() {
  const [code, setCode]           = useState('')
  const [language, setLanguage]   = useState('javascript')
  const [phase, setPhase]         = useState('idle')   // idle | streaming | done | error
  const [rawText, setRawText]     = useState('')
  const [review, setReview]       = useState(null)
  const [errorMsg, setErrorMsg]   = useState('')
  const accRef                    = useRef('')

  function loadExample(ex) {
    setCode(ex.code)
    setLanguage(ex.language)
    setPhase('idle')
    setReview(null)
    setRawText('')
  }

  async function handleReview() {
    if (!code.trim() || phase === 'streaming') return

    setPhase('streaming')
    setReview(null)
    setRawText('')
    setErrorMsg('')
    accRef.current = ''

    await reviewCode({
      code,
      language,
      onChunk(chunk) {
        accRef.current += chunk
        setRawText(accRef.current)
      },
      onDone() {
        const parsed = parseReview(accRef.current)
        if (parsed) {
          setReview(parsed)
          setPhase('done')
        } else {
          setErrorMsg('Gemini returned an unexpected format. Try again.')
          setPhase('error')
        }
      },
      onError(msg) {
        setErrorMsg(msg)
        setPhase('error')
      },
    })
  }

  function handleReset() {
    setPhase('idle')
    setReview(null)
    setRawText('')
    setErrorMsg('')
  }

  const canSubmit = code.trim().length > 0 && phase !== 'streaming'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Purple glow at top */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 40% at 50% -10%, rgba(124,106,247,0.14) 0%, transparent 65%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <header style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(13,13,18,0.85)',
          backdropFilter: 'blur(10px)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg, #7c6af7, #f472b6)',
              borderRadius: 9, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18,
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
                AI Code Reviewer
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                powered by Gemini 3.5 Flash
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {phase === 'done' && (
              <button
                onClick={handleReset}
                style={{
                  padding: '7px 14px',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text-sub)',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-sub)'}
              >
                ← New review
              </button>
            )}
          </div>
        </header>

        {/* Main layout */}
        <main style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: phase === 'done' ? '1fr 1fr' : '1fr',
          maxWidth: phase === 'done' ? '100%' : 800,
          margin: phase === 'done' ? '0' : '0 auto',
          width: '100%',
          transition: 'all 0.4s ease',
        }}>

          {/* Left panel — code editor */}
          <div style={{
            padding: '2rem',
            borderRight: phase === 'done' ? '1px solid var(--border)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>

            {/* Only show hero text when idle */}
            {phase === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 style={{
                  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  marginBottom: '0.75rem',
                  background: 'linear-gradient(135deg, var(--text) 30%, var(--purple))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Paste your code.<br />Get a real review.
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7 }}>
                  Bugs, performance, security, accessibility, best practices —
                  structured and actionable, not a wall of text.
                </p>
              </motion.div>
            )}

            {/* Example snippets */}
            {phase === 'idle' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Try an example
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXAMPLES.map(ex => (
                    <button
                      key={ex.label}
                      onClick={() => loadExample(ex)}
                      style={{
                        padding: '5px 12px',
                        border: '1px solid var(--border-mid)',
                        borderRadius: 20,
                        fontSize: 12,
                        color: 'var(--text-sub)',
                        transition: 'all 0.15s',
                        background: 'var(--bg-surface)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--purple)'
                        e.currentTarget.style.color = 'var(--text)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-mid)'
                        e.currentTarget.style.color = 'var(--text-sub)'
                      }}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Language selector */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Language
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: '100%' }}>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={{
                      padding: '4px 10px',
                      border: `1px solid ${language === lang ? 'var(--purple)' : 'var(--border)'}`,
                      borderRadius: 6,
                      fontSize: 11,
                      color: language === lang ? 'var(--purple)' : 'var(--text-muted)',
                      background: language === lang ? 'var(--purple-glow)' : 'transparent',
                      fontWeight: language === lang ? 600 : 400,
                      transition: 'all 0.15s',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Code textarea */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              flex: 1,
            }}>
              <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {['#f87171', '#fbbf24', '#34d399'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
                ))}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
                  {language}
                </span>
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={`Paste your ${language} code here...`}
                spellCheck={false}
                style={{
                  width: '100%',
                  minHeight: 320,
                  padding: '1rem',
                  fontSize: 13,
                  lineHeight: 1.7,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text)',
                  background: 'transparent',
                  resize: 'vertical',
                  display: 'block',
                  border: 'none',
                  outline: 'none',
                }}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={handleReview}
              disabled={!canSubmit}
              style={{
                padding: '0.85rem',
                background: canSubmit ? 'var(--purple)' : 'var(--bg-elevated)',
                color: canSubmit ? 'white' : 'var(--text-muted)',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.2s',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                letterSpacing: '-0.01em',
              }}
            >
              {phase === 'streaming' ? 'Analysing...' : 'Review Code →'}
            </button>

            {/* Error */}
            {phase === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--red-bg)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: 'var(--radius)',
                  padding: '0.75rem 1rem',
                  fontSize: 13,
                  color: 'var(--red)',
                }}
              >
                {errorMsg}
              </motion.div>
            )}
          </div>

          {/* Right panel — review results */}
          <AnimatePresence>
            {(phase === 'streaming' || phase === 'done') && (
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                style={{ padding: '2rem', overflowY: 'auto' }}
              >
                <ReviewPanel
                  review={review}
                  streaming={phase === 'streaming'}
                  rawText={rawText}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
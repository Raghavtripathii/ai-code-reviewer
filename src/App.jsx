import { useState } from 'react'
import { reviewCode, parseReview } from './gemini.js'

const TEST_CODE = `function getUser(id) {
  var result = db.query("SELECT * FROM users WHERE id = " + id)
  return result
}`

export default function App() {
  const [status, setStatus]   = useState('idle')
  const [raw, setRaw]         = useState('')
  const [parsed, setParsed]   = useState(null)

  async function handleTest() {
    setStatus('streaming...')
    setRaw('')
    setParsed(null)

    let accumulated = ''

    await reviewCode({
      code: TEST_CODE,
      language: 'javascript',
      onChunk: (chunk) => {
        accumulated += chunk
        setRaw(accumulated)
      },
      onDone: () => {
        const result = parseReview(accumulated)
        setParsed(result)
        setStatus(result ? 'parsed successfully' : 'parse failed — check raw output')
      },
      onError: (msg) => {
        setStatus('error: ' + msg)
      },
    })
  }

  return (
    <div style={{ padding: '2rem', color: 'white', fontFamily: 'monospace', maxWidth: 800 }}>
      <h1 style={{ marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>
        AI Code Reviewer — API Test
      </h1>

      <p style={{ color: '#8888a0', marginBottom: '1.5rem', fontSize: 13 }}>
        This tests that Gemini is connected and returning structured JSON.
        Real UI comes in the next commit.
      </p>

      <button
        onClick={handleTest}
        disabled={status === 'streaming...'}
        style={{
          padding: '10px 24px',
          background: '#7c6af7',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          marginBottom: '1.5rem',
          opacity: status === 'streaming...' ? 0.6 : 1,
        }}
      >
        {status === 'streaming...' ? 'Reviewing...' : 'Test API Call'}
      </button>

      <div style={{ color: '#34d399', marginBottom: '1rem', fontSize: 13 }}>
        Status: {status}
      </div>

      {parsed && (
        <div style={{
          background: '#13131a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <div style={{ color: '#8888a0', fontSize: 11, marginBottom: 8 }}>PARSED RESULT</div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            Health Score: <span style={{ color: '#7c6af7', fontWeight: 700 }}>{parsed.healthScore}</span>
          </div>
          <div style={{ fontSize: 13, color: '#8888a0' }}>{parsed.summary}</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            Bugs found: <span style={{ color: '#f87171' }}>{parsed.categories.bugs.length}</span>
            &nbsp;| Security: <span style={{ color: '#fbbf24' }}>{parsed.categories.security.length}</span>
            &nbsp;| Performance: <span style={{ color: '#60a5fa' }}>{parsed.categories.performance.length}</span>
          </div>
        </div>
      )}

      {raw && (
        <div>
          <div style={{ color: '#8888a0', fontSize: 11, marginBottom: 6 }}>RAW STREAM OUTPUT</div>
          <pre style={{
            background: '#13131a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '1rem',
            fontSize: 11,
            overflow: 'auto',
            maxHeight: 400,
            color: '#e8e8f0',
            whiteSpace: 'pre-wrap',
          }}>
            {raw}
          </pre>
        </div>
      )}
    </div>
  )
}
import { useState } from 'react'
import { motion } from 'framer-motion'

const SEVERITY = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', label: 'Critical' },
  warning:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  label: 'Warning'  },
  info:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  label: 'Info'     },
}

const CATEGORIES = [
  { key: 'bugs',          label: 'Bugs',          icon: '🐛' },
  { key: 'security',      label: 'Security',       icon: '🔒' },
  { key: 'performance',   label: 'Performance',    icon: '⚡' },
  { key: 'accessibility', label: 'Accessibility',  icon: '♿' },
  { key: 'bestPractices', label: 'Best Practices', icon: '✨' },
]

function HealthScore({ score }) {
  const color =
    score >= 80 ? '#34d399' :
    score >= 60 ? '#fbbf24' : '#f87171'

  const circumference = 2 * Math.PI * 36
  const offset = circumference - (score / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        padding: '1.25rem 1.5rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color,
        }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Health Score
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>
          {score >= 80 ? 'Good shape' : score >= 60 ? 'Needs work' : 'Critical issues'}
        </div>
      </div>
    </motion.div>
  )
}

// copies fix to clipboard, shows tick for a sec then resets
// TODO: might be nice to also copy the issue title
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy fix to clipboard"
      style={{
        padding: '3px 8px',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 5,
        fontSize: 10,
        color: copied ? '#34d399' : 'var(--text-muted)',
        background: 'var(--bg-elevated)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
        fontFamily: 'var(--font)',
      }}
    >
      {copied ? '✓ Copied' : 'Copy fix'}
    </button>
  )
}

function IssueCard({ issue, index }) {
  const sev = SEVERITY[issue.severity] || SEVERITY.info

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <span style={{
          padding: '2px 8px',
          background: sev.bg,
          border: `1px solid ${sev.border}`,
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          color: sev.color,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          flexShrink: 0,
          marginTop: 2,
        }}>
          {sev.label}
        </span>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
          {issue.title}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: 8 }}>
        {issue.description}
      </div>

      {issue.fix && (
        <div style={{
          background: 'var(--bg-elevated)',
          borderRadius: 6,
          padding: '0.6rem 0.75rem',
          fontSize: 12,
          color: 'var(--green)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.6,
          borderLeft: '3px solid var(--green)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: 11 }}>Suggested fix</span>
            <CopyButton text={issue.fix} />
          </div>
          {issue.fix}
        </div>
      )}
    </motion.div>
  )
}

function CategorySection({ category, issues, index }) {
  if (!issues || issues.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.08 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.75rem 1rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          marginBottom: '0.75rem',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}
      >
        <span>{category.icon}</span>
        <span>{category.label}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 12 }}>✓ No issues</span>
      </motion.div>
    )
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: '0.6rem',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text)',
      }}>
        <span>{category.icon}</span>
        <span>{category.label}</span>
        <span style={{
          marginLeft: 6,
          padding: '1px 7px',
          background: 'var(--bg-elevated)',
          borderRadius: 10,
          fontSize: 11,
          color: 'var(--text-sub)',
        }}>
          {issues.length}
        </span>
      </div>
      {issues.map((issue, i) => (
        <IssueCard key={i} issue={issue} index={i} />
      ))}
    </div>
  )
}

function StreamingSkeleton({ rawText }) {
  return (
    <div>
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Analysing your code...
        </div>
        {[80, 60, 45].map((w, i) => (
          <div key={i} style={{
            height: 12, width: `${w}%`, borderRadius: 6, marginBottom: 8,
            backgroundImage: 'linear-gradient(90deg, var(--bg-elevated) 0%, var(--bg-hover) 50%, var(--bg-elevated) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear',
          }} />
        ))}
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
      {rawText && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          lineHeight: 1.7,
          maxHeight: 300,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }}>
          {rawText}
          <span style={{
            display: 'inline-block', width: 8, height: 14,
            background: 'var(--purple)', marginLeft: 2,
            animation: 'blink 1s step-end infinite',
          }} />
          <style>{`@keyframes blink { 50%{opacity:0} }`}</style>
        </div>
      )}
    </div>
  )
}

export default function ReviewPanel({ review, streaming, rawText }) {
  if (streaming && !review) {
    return <StreamingSkeleton rawText={rawText} />
  }

  if (!review) return null

  return (
    <div>
      {review.summary && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.7, marginBottom: '1.25rem' }}
        >
          {review.summary}
        </motion.p>
      )}
      <HealthScore score={review.healthScore} />
      {CATEGORIES.map((cat, i) => (
        <CategorySection
          key={cat.key}
          category={cat}
          issues={review.categories[cat.key]}
          index={i}
        />
      ))}
    </div>
  )
}
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const inputStyle = { padding: '12px 16px', background: '#1a1a2e', border: '1px solid #333', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }

export default function Dashboard({ token }) {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function checkPrice(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const data = await fetch(`/api/prices/fresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url }),
      }).then(r => r.json())
      setResult(data)
    } catch { setResult({ error: 'Could not reach backend' }) }
    setLoading(false)
  }

  if (!token) return navigate('/login')

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Dashboard</h1>
        <p style={{ color: '#888', fontSize: '14px' }}>Check any URL to see if you're being charged more than a fresh customer.</p>
      </div>
      <form onSubmit={checkPrice} style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/product" required style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" disabled={loading} style={{ ...inputStyle, background: '#7bf5a7', color: '#0f0f1a', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Checking...' : 'Check Price'}
        </button>
      </form>
      {result && (
        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '24px' }}>
          {result.error ? <div style={{ color: '#ff6b6b' }}>{result.error}</div>
           : result.fresh_price ? (
            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Fresh Customer Price</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#7bf5a7' }}>${result.fresh_price.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Source</div>
                <div style={{ fontSize: '16px', color: '#ccc' }}>{result.source}</div>
              </div>
            </div>
          ) : <div style={{ color: '#888' }}>No fresh price found for this URL.</div>}
        </div>
      )}
    </div>
  )
}

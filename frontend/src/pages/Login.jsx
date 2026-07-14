import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'
const s = { minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const f = { background: '#1a1a2e', padding: '40px', borderRadius: '16px', width: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }
const i = { padding: '12px', background: '#2a2a4a', border: '1px solid #333', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handle(e) {
    e.preventDefault()
    setError('')
    try {
      let res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.status === 401) {
        res = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
      }
      if (!res.ok) throw new Error('Auth failed')
      const { access_token } = await res.json()
      localStorage.setItem('token', access_token)
      onLogin(access_token)
      navigate('/')
    } catch (err) { setError(err.message) }
  }

  return (
    <div style={s}>
      <form onSubmit={handle} style={f}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontWeight: 700, fontSize: '22px', color: '#7bf5a7', marginBottom: '6px' }}>PriceScope</div>
          <div style={{ color: '#888', fontSize: '13px' }}>Sign in to your account</div>
        </div>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={i} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={i} />
        {error && <div style={{ color: '#ff6b6b', fontSize: '13px', textAlign: 'center', padding: '8px', background: 'rgba(255,107,107,.1)', borderRadius: '8px' }}>{error}</div>}
        <button type="submit" style={{ ...i, background: '#7bf5a7', color: '#0f0f1a', fontWeight: 700, cursor: 'pointer' }}>Continue</button>
        <div style={{ color: '#555', fontSize: '12px', textAlign: 'center' }}>No account? Register automatically on first login.</div>
      </form>
    </div>
  )
}

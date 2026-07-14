import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'

const API = '/api'
const inputStyle = { padding: '12px 16px', background: '#1a1a2e', border: '1px solid #333', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }

export default function Alerts({ token }) {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [url, setUrl] = useState('')
  const [target, setTarget] = useState('')

  if (!token) return <Navigate to="/login" />

  useEffect(() => { loadAlerts() }, [token])

  async function loadAlerts() {
    setAlerts(await fetch(`${API}/prices/alerts`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()))
  }

  async function createAlert(e) {
    e.preventDefault()
    await fetch(`${API}/prices/alerts?url=${encodeURIComponent(url)}&target_price=${target}`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
    })
    setUrl('')
    setTarget('')
    loadAlerts()
  }

  async function deleteAlert(id) {
    await fetch(`${API}/prices/alerts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    loadAlerts()
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Price Alerts</h1>
      <form onSubmit={createAlert} style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/product" required style={{ ...inputStyle, flex: 2 }} />
        <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Target price $" required type="number" step="0.01" style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{ ...inputStyle, background: '#7bf5a7', color: '#0f0f1a', fontWeight: 700, cursor: 'pointer', flex: 0 }}>Set Alert</button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.length === 0 && <div style={{ color: '#555', fontSize: '14px' }}>No alerts yet.</div>}
        {alerts.map(a => (
          <div key={a.id} style={{ background: '#1a1a2e', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#ccc', wordBreak: 'break-all' }}>{a.url}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>Target: <span style={{ color: '#7bf5a7' }}>${a.target_price}</span></div>
            </div>
            <button onClick={() => deleteAlert(a.id)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

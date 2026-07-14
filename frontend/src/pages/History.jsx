import { Navigate } from 'react-router-dom'

export default function History({ token }) {
  if (!token) return <Navigate to="/login" />

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Price History</h1>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>History is populated from price snapshots captured by the browser extension.</p>
      <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '24px', color: '#888', fontSize: '14px' }}>
        Use the browser extension to browse products and capture price snapshots. Your history will appear here.
      </div>
    </div>
  )
}

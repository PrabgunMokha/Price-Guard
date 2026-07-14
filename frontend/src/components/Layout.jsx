import { Outlet, NavLink } from 'react-router-dom'

const linkStyle = ({ isActive }) => ({
  color: isActive ? '#7bf5a7' : '#888',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: isActive ? 600 : 400,
})

export default function Layout({ token, logout }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#fff', fontFamily: '-apple-system, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #222' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#7bf5a7' }}>PriceScope</span>
          {token && (
            <>
              <NavLink to="/" style={linkStyle} end>Dashboard</NavLink>
              <NavLink to="/history" style={linkStyle}>History</NavLink>
              <NavLink to="/alerts" style={linkStyle}>Alerts</NavLink>
            </>
          )}
        </div>
        {token && (
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            Sign Out
          </button>
        )}
      </nav>
      <main style={{ padding: '32px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  )
}

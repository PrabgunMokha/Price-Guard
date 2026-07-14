export default function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #222', borderTopColor: '#7bf5a7', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
    </div>
  )
}

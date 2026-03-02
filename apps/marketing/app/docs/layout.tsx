export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', background: '#f9f9f9', padding: '2rem', borderRight: '1px solid #eee', overflow: 'auto' }}>
        <nav>
          <h3 style={{ marginBottom: '1rem', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', color: '#999' }}>
            Documentation
          </h3>
          <ul style={{ listStyle: 'none' }}>
            <li><a href="/docs" style={{ display: 'block', padding: '0.5rem 0', color: '#0066cc' }}>Getting Started</a></li>
            <li><a href="/docs/quickstart" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>Quickstart</a></li>
            <li><a href="/docs/authentication" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>Authentication</a></li>
            <li><a href="/docs/sms" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>Sending SMS</a></li>
            <li><a href="/docs/email" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>Sending Email</a></li>
            <li><a href="/docs/whatsapp" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>WhatsApp Messages</a></li>
            <li><a href="/docs/voice" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>Voice Calls</a></li>
            <li><a href="/docs/webhooks" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>Webhooks</a></li>
            <li><a href="/docs/api" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>API Reference</a></li>
            <li><a href="/docs/errors" style={{ display: 'block', padding: '0.5rem 0', color: '#1a1a1a' }}>Error Codes</a></li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}

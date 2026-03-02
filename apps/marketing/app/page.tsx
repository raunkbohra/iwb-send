import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">iWB Send</div>
        <ul className="navbar-links">
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/docs">Docs</Link></li>
          <li><Link href="https://app.iwbsend.com">Sign In</Link></li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Unified Communication for Global Reach</h1>
          <p>Send SMS, Email, WhatsApp, and Voice through one powerful API. Perfect for Nepal, India, and beyond.</p>
          <div className="hero-cta">
            <button className="primary"><Link href="https://app.iwbsend.com/signup">Get Started Free</Link></button>
            <button className="secondary"><Link href="/docs">View Documentation</Link></button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section" id="features">
        <div className="container">
          <h2>Powerful Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>📱 Multi-Channel</h3>
              <p>Send SMS, Email, WhatsApp, and Voice from a single API endpoint. No vendor lock-in.</p>
            </div>
            <div className="feature-card">
              <h3>🚀 Intelligent Routing</h3>
              <p>Smart routing engine automatically selects the best provider based on compliance, cost, and reliability.</p>
            </div>
            <div className="feature-card">
              <h3>🔒 Multi-Tenant</h3>
              <p>Enterprise-grade isolation. Perfect for SaaS platforms and agencies serving multiple customers.</p>
            </div>
            <div className="feature-card">
              <h3>📊 Real-Time Analytics</h3>
              <p>Track delivery status, costs, and performance in real-time. Detailed logs for every message.</p>
            </div>
            <div className="feature-card">
              <h3>💰 Pay As You Go</h3>
              <p>No monthly commitments. Pay only for messages sent. Transparent pricing, no hidden fees.</p>
            </div>
            <div className="feature-card">
              <h3>🌍 Global Coverage</h3>
              <p>Support for multiple providers across Nepal, India, and worldwide. Automatic failover for reliability.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section" id="pricing">
        <div className="container">
          <h2>Simple, Transparent Pricing</h2>
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Price per Message</th>
                <th>Min Order</th>
                <th>Best For</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>SMS (Nepal)</td>
                <td>$0.001</td>
                <td>$5</td>
                <td>Transactional alerts, OTP</td>
              </tr>
              <tr>
                <td>SMS (India)</td>
                <td>$0.0008</td>
                <td>$5</td>
                <td>Bulk campaigns, notifications</td>
              </tr>
              <tr>
                <td>Email</td>
                <td>$0.0001</td>
                <td>$1</td>
                <td>Newsletters, confirmations</td>
              </tr>
              <tr>
                <td>WhatsApp</td>
                <td>$0.002</td>
                <td>$10</td>
                <td>Customer support, engagement</td>
              </tr>
              <tr>
                <td>Voice Call</td>
                <td>$0.01</td>
                <td>$20</td>
                <td>Two-factor auth, outreach</td>
              </tr>
            </tbody>
          </table>
          <p style={{ textAlign: 'center', marginTop: '2rem', color: '#666' }}>
            No setup fees. No hidden charges. Cancel anytime.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section" style={{ textAlign: 'center', background: '#f9f9f9' }}>
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p style={{ marginBottom: '2rem' }}>Create your account today and send your first message in minutes.</p>
          <button className="primary" style={{ padding: '12px 32px', fontSize: '18px' }}>
            <Link href="https://app.iwbsend.com/signup">Start Free Trial</Link>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><Link href="/#features">Features</Link></li>
                <li><Link href="/#pricing">Pricing</Link></li>
                <li><Link href="/docs">Documentation</Link></li>
                <li><Link href="/docs/api">API Reference</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/careers">Careers</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Legal</h4>
              <ul>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/compliance">Compliance</Link></li>
                <li><Link href="/security">Security</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Resources</h4>
              <ul>
                <li><Link href="/docs/guides">Guides</Link></li>
                <li><Link href="/docs/sdk">SDKs</Link></li>
                <li><Link href="/status">Status Page</Link></li>
                <li><Link href="/support">Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 iWB Send. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

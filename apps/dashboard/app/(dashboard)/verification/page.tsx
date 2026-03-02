'use client';

import { useState } from 'react';

export default function VerificationPage() {
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('NP');

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call POST /api/v1/sender-identities
    console.log('Adding domain:', email);
  };

  const handleSearchNumbers = () => {
    // TODO: Call GET /api/v1/phone-numbers/search
    console.log('Searching for', country);
  };

  return (
    <>
      <div className="page-header">
        <h1>Verification Status</h1>
        <p>Manage sender identities, domains, phone numbers, and KYC documents</p>
      </div>

      {/* Email Domain */}
      <div className="card">
        <h2>📧 Email Domain Verification</h2>
        <form onSubmit={handleAddDomain}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="noreply@mycompany.com"
              value={email}
              onChange={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
            />
          </div>
          <button className="primary">Add Domain</button>
        </form>
      </div>

      {/* Phone Numbers */}
      <div className="card">
        <h2>📱 Phone Numbers</h2>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ marginRight: '1rem' }}>Country:</label>
          <select
            value={country}
            onChange={(e) => setCountry((e.currentTarget as HTMLSelectElement).value)}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="NP">Nepal</option>
            <option value="IN">India</option>
            <option value="US">USA</option>
          </select>
        </div>
        <button className="primary" onClick={handleSearchNumbers}>Search Available Numbers</button>
      </div>

      {/* WhatsApp */}
      <div className="card">
        <h2>💬 WhatsApp Business Account</h2>
        <p>Link your Meta Business Account to send WhatsApp messages</p>
        <button className="primary">Link WhatsApp Account</button>
      </div>

      {/* KYC */}
      <div className="card">
        <h2>📋 KYC Documents</h2>
        <p>Upload business documents to unlock regional sending capabilities</p>
        <div style={{ marginTop: '1rem' }}>
          <input type="file" />
          <button className="primary" style={{ marginLeft: '1rem' }}>Upload Document</button>
        </div>
      </div>

      {/* Verification Status Summary */}
      <div className="card">
        <h2>✓ Verification Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px' }}>0</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>Email Domains</div>
          </div>
          <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px' }}>0</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>Phone Numbers</div>
          </div>
          <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px' }}>0</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>KYC Documents</div>
          </div>
        </div>
      </div>
    </>
  );
}

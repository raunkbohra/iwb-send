'use client';

import { useState } from 'react';

export default function ApiKeysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call POST /api/v1/api-keys
    console.log('Creating key:', name);
  };

  // Mock keys
  const keys = [
    {
      id: 'key-1',
      name: 'Production',
      prefix: 'sk_live_',
      createdAt: '2024-02-01',
      lastUsed: '2024-03-02T10:30:00Z',
    },
  ];

  return (
    <>
      <div className="page-header">
        <h1>API Keys</h1>
        <p>Create and manage API keys for your integrations</p>
      </div>

      {showCreate && (
        <div className="card">
          <h2>Create New API Key</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Key Name</label>
              <input
                type="text"
                placeholder="Production, Development, Testing..."
                value={name}
                onChange={(e) => setName((e.currentTarget as HTMLInputElement).value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="primary">Create Key</button>
              <button className="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Your API Keys</h2>
          {!showCreate && <button className="primary" onClick={() => setShowCreate(true)}>Create New Key</button>}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Created</th>
              <th>Last Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id}>
                <td>{key.name}</td>
                <td><code>{key.prefix}</code></td>
                <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                <td>{key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button className="secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '12px' }}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

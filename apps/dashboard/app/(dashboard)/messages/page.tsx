'use client';

import { useState } from 'react';

export default function MessagesPage() {
  const [filter, setFilter] = useState('all');

  // Mock data
  const messages = [
    {
      id: 'msg-001',
      to: '+9779801234567',
      channel: 'SMS',
      status: 'DELIVERED',
      createdAt: '2024-03-02T10:30:00Z',
      cost: 0.001,
    },
    {
      id: 'msg-002',
      to: 'user@example.com',
      channel: 'EMAIL',
      status: 'SENT',
      createdAt: '2024-03-02T09:15:00Z',
      cost: 0.0001,
    },
    {
      id: 'msg-003',
      to: '+919999000123',
      channel: 'SMS',
      status: 'FAILED',
      createdAt: '2024-03-02T08:45:00Z',
      cost: 0,
    },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Messages</h1>
        <p>View all sent messages and their delivery status</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search by phone, email, or ID..."
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <select
            value={filter}
            onChange={(e) => setFilter((e.currentTarget as HTMLSelectElement).value)}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>To</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Cost</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg) => (
              <tr key={msg.id}>
                <td>{msg.to}</td>
                <td>{msg.channel}</td>
                <td>
                  <span className={`status-badge ${msg.status.toLowerCase()}`}>
                    {msg.status}
                  </span>
                </td>
                <td>${msg.cost.toFixed(4)}</td>
                <td>{new Date(msg.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

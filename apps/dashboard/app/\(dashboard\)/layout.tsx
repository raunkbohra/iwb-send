'use client';

import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">iWB Send</div>
        <nav className="sidebar-nav">
          <li><Link href="/messages" className="active">Messages</Link></li>
          <li><Link href="/api-keys">API Keys</Link></li>
          <li><Link href="/templates">Templates</Link></li>
          <li><Link href="/verification">Verification</Link></li>
          <li><Link href="/wallet">Wallet</Link></li>
          <li><Link href="/settings">Settings</Link></li>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div>Dashboard</div>
          <div className="topbar-user">
            <span>john@example.com</span>
            <button className="secondary">Sign Out</button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </>
  );
}

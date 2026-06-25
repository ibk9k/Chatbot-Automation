'use client';

import React, { useState, useEffect } from 'react';

// Mock Client Data type
interface ClientData {
  id: string;
  name: string;
  systemPrompt: string;
  allowedDomain: string;
  monthlyLimit: number;
  messagesUsed: number;
}

// Initial Mock Clients
const initialClients: ClientData[] = [
  {
    id: 'test-client',
    name: 'Local Sandbox',
    systemPrompt: 'You are a helpful and polite test assistant for the local chatbot sandbox. Keep answers short and friendly, and reference that you are running in test mode.',
    allowedDomain: 'localhost',
    monthlyLimit: 5,
    messagesUsed: 0,
  },
  {
    id: 'craftsfabrics',
    name: 'CraftsFabrics',
    systemPrompt: 'You are a friendly assistant for CraftsFabrics, a UK fabric shop. Help customers with products, shipping, and orders. Be warm, professional, and brief.',
    allowedDomain: 'craftsfabrics.com',
    monthlyLimit: 2000,
    messagesUsed: 1245,
  },
  {
    id: 'apex-saas',
    name: 'Apex SaaS platform',
    systemPrompt: 'You are a technical support bot for Apex SaaS. Assist users with billing, integrations, API tokens, and subscription plans. Maintain a helpful and engineering-focused tone.',
    allowedDomain: 'apexcorp.io',
    monthlyLimit: 5000,
    messagesUsed: 4998,
  }
];

// Initial mock logs
const initialLogs = [
  {
    time: '12:04:12',
    method: 'POST',
    path: '/api/chat',
    clientId: 'craftsfabrics',
    origin: 'https://www.craftsfabrics.com',
    status: '200 OK',
    details: 'OpenAI Stream Completed — 56 tokens generated. Logs inserted.',
    type: 'success',
  },
  {
    time: '12:05:33',
    method: 'POST',
    path: '/api/chat',
    clientId: 'craftsfabrics',
    origin: 'https://malicious-copycat-domain.net',
    status: '403 Forbidden',
    details: 'Origin Block: Request origin does not match allowed domain: craftsfabrics.com',
    type: 'blocked',
  },
  {
    time: '12:08:04',
    method: 'POST',
    path: '/api/chat',
    clientId: 'apex-saas',
    origin: 'https://apexcorp.io',
    status: '200 OK',
    details: 'OpenAI Stream Completed — 112 tokens generated. Logs inserted.',
    type: 'success',
  },
  {
    time: '12:09:50',
    method: 'POST',
    path: '/api/chat',
    clientId: 'apex-saas',
    origin: 'https://apexcorp.io',
    status: '200 OK',
    details: 'Usage limit warning: client apex-saas at 4,998 / 5,000 monthly messages.',
    type: 'warning',
  },
  {
    time: '12:12:01',
    method: 'POST',
    path: '/api/chat',
    clientId: 'test-client',
    origin: 'http://localhost:3000',
    status: '200 OK',
    details: 'Local sandbox query. OpenAI Stream Completed — 28 tokens.',
    type: 'success',
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'clients' | 'logs' | 'docs'>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string>('test-client');
  const [clients, setClients] = useState<ClientData[]>(initialClients);
  const [logs, setLogs] = useState(initialLogs);
  const [copied, setCopied] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState<string>('https://remotelybot.vercel.app');

  // Resolve Vercel deployed host or current url for code snippets
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const activeClient = clients.find(c => c.id === selectedClientId) || clients[0];

  const handleCopy = () => {
    const scriptText = `<script src="${currentOrigin}/widget.js" data-client-id="${activeClient.id}"></script>`;
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simulate incoming logs in terminal tab
  useEffect(() => {
    if (activeTab !== 'logs') return;

    const interval = setInterval(() => {
      const timeNow = new Date().toLocaleTimeString([], { hour12: false });
      const randomClient = clients[Math.floor(Math.random() * clients.length)];
      
      // Random event: success request, blocked request, or limit hit
      const randType = Math.random();
      let newLog;

      if (randType < 0.65) {
        // Success request
        newLog = {
          time: timeNow,
          method: 'POST',
          path: '/api/chat',
          clientId: randomClient.id,
          origin: `https://www.${randomClient.allowedDomain === 'localhost' ? 'localhost:3000' : randomClient.allowedDomain}`,
          status: '200 OK',
          details: `OpenAI Stream Completed — ${Math.floor(Math.random() * 80) + 20} tokens. Count incremented.`,
          type: 'success',
        };
        // Safely update state counts
        setClients(prev => prev.map(c => {
          if (c.id === randomClient.id && c.messagesUsed < c.monthlyLimit) {
            return { ...c, messagesUsed: c.messagesUsed + 1 };
          }
          return c;
        }));
      } else if (randType < 0.85) {
        // Blocked request (Origin mismatch)
        const hackerDomains = ['hackerportal.org', 'steal-my-ai.io', 'unauthorized-embed.co.uk'];
        newLog = {
          time: timeNow,
          method: 'POST',
          path: '/api/chat',
          clientId: randomClient.id,
          origin: `https://${hackerDomains[Math.floor(Math.random() * hackerDomains.length)]}`,
          status: '403 Forbidden',
          details: `Origin Block: Request origin does not match allowed domain: ${randomClient.allowedDomain}`,
          type: 'blocked',
        };
      } else {
        // Blocked request (Limit reached)
        newLog = {
          time: timeNow,
          method: 'POST',
          path: '/api/chat',
          clientId: randomClient.id,
          origin: `https://www.${randomClient.allowedDomain === 'localhost' ? 'localhost:3000' : randomClient.allowedDomain}`,
          status: '200 OK (Limit Block)',
          details: `Rejected: Client '${randomClient.id}' has reached the monthly cap of ${randomClient.monthlyLimit} messages.`,
          type: 'warning',
        };
      }

      setLogs(prev => [newLog, ...prev.slice(0, 14)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [activeTab, clients]);

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow" />
        <div className="hero-container">
          <div className="hero-badge">
            <span>✨</span> Single Deployment. Unlimited AI Chatbots.
          </div>
          <h1 className="hero-title">
            Secure Multi-Tenant Chatbot Service
          </h1>
          <p className="hero-subtitle">
            Deploy once, serve infinitely. Let your clients host their own branded AI assistants on their websites. Keeps OpenAI credentials secure on your backend, and controls monthly limits dynamically.
          </p>
        </div>
      </section>

      {/* Dashboard Sandbox UI */}
      <section className="dashboard-container">
        <div className="dashboard-card">
          {/* Header */}
          <div className="dashboard-header">
            <div className="dashboard-title-group">
              <div className="dashboard-logo">R</div>
              <div>
                <div className="dashboard-title">RemotelyBot Control Panel</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Administration Console</div>
              </div>
            </div>
            <div className="dashboard-status">
              <div className="dashboard-status-dot" />
              <span>Service Active</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveTab('clients')}
            >
              💼 Client Management
            </button>
            <button 
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              📟 Live Traffic Monitor
            </button>
            <button 
              className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
              onClick={() => setActiveTab('docs')}
            >
              📖 Integration Guide
            </button>
          </div>

          {/* Tab Contents */}
          <div className="tab-content">
            
            {/* Tab 1: Clients List */}
            {activeTab === 'clients' && (
              <div className="dashboard-grid">
                {/* Sidebar */}
                <div className="client-sidebar">
                  <div className="sidebar-title">Registered Clients</div>
                  <div className="client-list">
                    {clients.map(client => (
                      <button
                        key={client.id}
                        className={`client-item ${selectedClientId === client.id ? 'active' : ''}`}
                        onClick={() => setSelectedClientId(client.id)}
                      >
                        <div className="client-item-header">
                          <span className="client-item-name">{client.name}</span>
                          <span className="client-item-limit">ID: {client.id}</span>
                        </div>
                        <div className="client-item-domain">{client.allowedDomain}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      💡 Row-level client setups live in Supabase. Adding or deleting rows updates client bots instantly.
                    </p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="detail-panel">
                  <div className="detail-section">
                    <div className="detail-section-title">
                      ⚙️ Configuration details for: <strong>{activeClient.name}</strong>
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>System Prompt (AI Personality)</label>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.5', border: '1px solid rgba(255,255,255,0.05)', color: '#e4e4e7' }}>
                        "{activeClient.systemPrompt}"
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Allowed Website Domain</label>
                        <div style={{ fontFamily: 'monospace', color: '#818cf8', fontWeight: 600 }}>{activeClient.allowedDomain}</div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Security Status</label>
                        <span style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          Domain Check Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Limit Progress */}
                  <div className="detail-section">
                    <div className="detail-section-title">📊 Usage Tracking (Monthly Limit)</div>
                    <div className="usage-meter">
                      <div className="usage-bar-bg">
                        <div 
                          className="usage-bar-fill" 
                          style={{ width: `${Math.min(100, (activeClient.messagesUsed / activeClient.monthlyLimit) * 100)}%` }} 
                        />
                      </div>
                      <div className="usage-stats">
                        <span>{activeClient.messagesUsed} / {activeClient.monthlyLimit} messages sent</span>
                        <span style={{ fontWeight: 600, color: (activeClient.messagesUsed >= activeClient.monthlyLimit) ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                          {Math.round((activeClient.messagesUsed / activeClient.monthlyLimit) * 100)}% of Cap
                        </span>
                      </div>
                    </div>
                    {activeClient.messagesUsed >= activeClient.monthlyLimit && (
                      <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '12px', color: '#fca5a5' }}>
                        ⚠️ Monthly limit hit! The API route is automatically blocking further messages for this client.
                      </div>
                    )}
                  </div>

                  {/* Snippet Generator */}
                  <div className="detail-section">
                    <div className="detail-section-title">🔌 Embedded Snippet Code</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Copy and paste the script snippet before the closing <code>&lt;/body&gt;</code> tag on {activeClient.name}'s website.
                    </p>
                    <div className="snippet-box">
                      <button className="copy-btn" onClick={handleCopy}>
                        {copied ? '✅ Copied!' : '📋 Copy Snippet'}
                      </button>
                      <pre style={{ overflowX: 'auto', margin: 0, paddingRight: '100px' }}>
                        <code>{`<script 
  src="${currentOrigin}/widget.js" 
  data-client-id="${activeClient.id}">
</script>`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Live Logs Simulation */}
            {activeTab === 'logs' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>API Request Stream</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Real-time network logging from <code>/api/chat</code>. Shows cross-origin routing, CORS checks, and usage cap blocks in action. (Simulated stream updates every 4.5s)
                  </p>
                </div>
                <div className="logs-terminal">
                  {logs.map((log, index) => (
                    <div className="log-entry" key={index}>
                      <div className="log-info">
                        <span className="log-time">[{log.time}]</span>
                        <span className="log-badge post">{log.method} {log.path}</span>
                        <span style={{ color: '#ec4899', fontSize: '12px' }}>client:{log.clientId}</span>
                        <span className="log-badge origin">Origin: {log.origin}</span>
                        <span style={{ 
                          marginLeft: 'auto', 
                          fontWeight: 600, 
                          color: log.type === 'blocked' ? 'var(--danger-color)' : log.type === 'warning' ? 'var(--warning-color)' : 'var(--success-color)' 
                        }}>
                          {log.status}
                        </span>
                      </div>
                      <div className="log-text">
                        &gt; {log.details}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Integration Documentation */}
            {activeTab === 'docs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: '1.6', color: '#d4d4d8' }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '10px' }}>
                    How it Works under the Hood
                  </h3>
                  <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                    The service operates a secure, unified multi-tenant architecture designed to minimize hosting costs while ensuring security:
                  </p>
                  <ul style={{ paddingLeft: '20px', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>
                      <strong>Zero Leak Security:</strong> Your OpenAI API key and Supabase credentials never touch the client website. The frontend chat bubble only holds its <code>data-client-id</code>.
                    </li>
                    <li>
                      <strong>CORS & Domain Verification:</strong> The <code>/api/chat</code> endpoint inspects the incoming request's <code>Origin</code> header. Mismatched domain headers are rejected with a <code>432 / 403 Forbidden</code> before hitting the OpenAI completion layer.
                    </li>
                    <li>
                      <strong>Rate Capping:</strong> Each incoming question updates the database logs and usage stats. If a client exceeds their monthly allocation limits, the server returns a static message instead of invoking OpenAI, keeping your costs predictable.
                    </li>
                  </ul>
                </div>

                <hr style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />

                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>
                    Supabase Configuration Example
                  </h3>
                  <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                    To add a client, you insert a row to the <code>clients</code> table:
                  </p>
                  <div className="snippet-box">
                    <pre style={{ overflowX: 'auto', margin: 0 }}>
                      <code>{`INSERT INTO clients (id, name, system_prompt, allowed_domain, monthly_limit, messages_used)
VALUES (
  'craftsfabrics', 
  'CraftsFabrics Ltd.', 
  'You are a shop assistant...', 
  'craftsfabrics.com', 
  2000, 
  0
);`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>© 2026 RemotelyBot chatbot engine. Powered by Next.js & Supabase. Premium Design System.</p>
      </footer>
    </main>
  );
}

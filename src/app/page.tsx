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
  const [clients, setClients] = useState<ClientData[]>([]);
  const [logs, setLogs] = useState(initialLogs);
  const [copied, setCopied] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState<string>('https://remotelybot.vercel.app');

  // Password authorization state
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);

  // Modal State for Adding Clients
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newClientId, setNewClientId] = useState<string>('');
  const [newClientName, setNewClientName] = useState<string>('');
  const [newSystemPrompt, setNewSystemPrompt] = useState<string>('');
  const [newAllowedDomain, setNewAllowedDomain] = useState<string>('');
  const [newMonthlyLimit, setNewMonthlyLimit] = useState<number>(1000);
  const [modalError, setModalError] = useState<string>('');
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);

  // Check saved session on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password');
    if (savedPassword) {
      verifyPassword(savedPassword);
    }
  }, []);

  // Resolve Vercel deployed host or current url for code snippets
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const verifyPassword = async (pass: string) => {
    setIsValidating(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      });
      if (res.ok) {
        localStorage.setItem('admin_password', pass);
        setAdminPassword(pass);
        setIsAuthorized(true);
        fetchClients(pass);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Invalid password.');
        localStorage.removeItem('admin_password');
      }
    } catch (err) {
      setAuthError('Connection failed. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const fetchClients = async (pass: string) => {
    setIsLoadingClients(true);
    try {
      const res = await fetch('/api/admin/clients', {
        headers: {
          'Authorization': pass,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const clientList = data.clients || [];
        setClients(clientList);
        
        // Select first client if selection is empty or invalid
        if (clientList.length > 0) {
          setSelectedClientId(prev => {
            const exists = clientList.some((c: ClientData) => c.id === prev);
            return exists ? prev : clientList[0].id;
          });
        }
      } else {
        if (res.status === 401) {
          setIsAuthorized(false);
          localStorage.removeItem('admin_password');
        }
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_password');
    setAdminPassword('');
    setIsAuthorized(false);
    setClients([]);
  };

  const activeClient = clients.find(c => c.id === selectedClientId) || clients[0] || null;

  const handleCopy = () => {
    if (!activeClient) return;
    const scriptText = `<script src="${currentOrigin}/widget.js" data-client-id="${activeClient.id}"></script>`;
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simulate incoming logs in terminal tab
  useEffect(() => {
    if (activeTab !== 'logs' || clients.length === 0) return;

    const interval = setInterval(() => {
      if (clients.length === 0) return;
      const timeNow = new Date().toLocaleTimeString([], { hour12: false });
      const randomClient = clients[Math.floor(Math.random() * clients.length)];
      if (!randomClient) return;
      
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

  if (!isAuthorized) {
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

        {/* Lock Screen */}
        <section className="lockscreen-container">
          <div className="lockscreen-card">
            <div className="lockscreen-logo">R</div>
            <h2 className="lockscreen-title">Admin Console Locked</h2>
            <p className="lockscreen-subtitle">
              Please enter the administrator password to view client list, logs, and manage tenants.
            </p>
            
            {authError && <div className="alert-box">{authError}</div>}
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const pass = formData.get('password') as string;
              verifyPassword(pass);
            }}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" htmlFor="admin-password">Password</label>
                <input 
                  type="password" 
                  name="password"
                  id="admin-password"
                  className="form-input" 
                  placeholder="••••••••" 
                  required
                  disabled={isValidating}
                />
              </div>
              <button 
                type="submit" 
                className="btn form-submit-btn"
                disabled={isValidating}
              >
                {isValidating ? 'Verifying...' : 'Unlock Dashboard'}
              </button>
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <p>© 2026 RemotelyBot chatbot engine. Powered by Next.js & Supabase. Premium Design System.</p>
        </footer>
      </main>
    );
  }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="dashboard-status">
                <div className="dashboard-status-dot" />
                <span>Service Active</span>
              </div>
              <button className="lock-btn" onClick={handleLogout}>
                🔒 Lock Console
              </button>
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
                    {isLoadingClients ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Loading clients...
                      </div>
                    ) : clients.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                        No clients registered yet.
                      </div>
                    ) : (
                      clients.map(client => (
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
                      ))
                    )}
                  </div>
                  <div className="add-client-container">
                    <button 
                      className="add-client-btn"
                      onClick={() => {
                        setNewClientId('');
                        setNewClientName('');
                        setNewSystemPrompt('');
                        setNewAllowedDomain('');
                        setNewMonthlyLimit(1000);
                        setModalError('');
                        setIsModalOpen(true);
                      }}
                    >
                      ➕ Register New Client
                    </button>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      💡 Client setups live in Supabase. Adding new client configurations will write to the database and update client bots instantly.
                    </p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="detail-panel">
                  {!activeClient ? (
                    <div className="detail-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', padding: '60px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '32px', marginBottom: '16px' }}>💼</span>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Active Client</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                        Create a client tenant using the button in the sidebar to view configuration details and embed script snippet.
                      </p>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Chatbot Client</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            {modalError && <div className="alert-box">{modalError}</div>}
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsCreatingClient(true);
              setModalError('');
              
              try {
                const res = await fetch('/api/admin/clients', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminPassword,
                  },
                  body: JSON.stringify({
                    id: newClientId,
                    name: newClientName,
                    systemPrompt: newSystemPrompt,
                    allowedDomain: newAllowedDomain,
                    monthlyLimit: newMonthlyLimit,
                  }),
                });
                
                const data = await res.json();
                if (res.ok) {
                  setIsModalOpen(false);
                  await fetchClients(adminPassword);
                  setSelectedClientId(data.client.id);
                } else {
                  setModalError(data.error || 'Failed to register client.');
                }
              } catch (err) {
                setModalError('Connection error. Please try again.');
              } finally {
                setIsCreatingClient(false);
              }
            }}>
              <div className="form-group">
                <label className="form-label" htmlFor="client-id">Client ID (Unique URL Slug)</label>
                <input 
                  type="text" 
                  id="client-id"
                  className="form-input" 
                  placeholder="e.g. craftsfabrics" 
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  required
                  disabled={isCreatingClient}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Alphanumeric, lowercase, hyphens/underscores only. Used in script snippet.
                </span>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="client-name">Client Name (Display Name)</label>
                <input 
                  type="text" 
                  id="client-name"
                  className="form-input" 
                  placeholder="e.g. Crafts Fabrics Ltd." 
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  required
                  disabled={isCreatingClient}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="allowed-domain">Allowed Website Domain</label>
                <input 
                  type="text" 
                  id="allowed-domain"
                  className="form-input" 
                  placeholder="e.g. craftsfabrics.com or localhost" 
                  value={newAllowedDomain}
                  onChange={(e) => setNewAllowedDomain(e.target.value)}
                  required
                  disabled={isCreatingClient}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Only requests originating from this domain will be allowed to query the chatbot API.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="monthly-limit">Monthly Message Cap</label>
                <input 
                  type="number" 
                  id="monthly-limit"
                  className="form-input" 
                  placeholder="1000" 
                  value={newMonthlyLimit}
                  onChange={(e) => setNewMonthlyLimit(parseInt(e.target.value, 10) || 0)}
                  min="1"
                  required
                  disabled={isCreatingClient}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="system-prompt">System Prompt (AI Personality)</label>
                <textarea 
                  id="system-prompt"
                  className="form-input form-textarea" 
                  placeholder="e.g. You are a shop assistant for CraftsFabrics..." 
                  value={newSystemPrompt}
                  onChange={(e) => setNewSystemPrompt(e.target.value)}
                  required
                  disabled={isCreatingClient}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isCreatingClient}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={isCreatingClient}>
                  {isCreatingClient ? 'Registering...' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

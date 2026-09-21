import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const symbols = ['SOL/USDT', 'BTC/USDT', 'ETH/USDT', 'DOGE/USDT', 'TRX/USDT', 'ARB/USDT']

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 3-4 3 2 5-7" /></>,
    sliders: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 3.8 1.9c-1 .7-1.5 1.1-1.5 2.4" /><path d="M12 17h.01" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    wallet: <><path d="M4 7V5a2 2 0 0 1 2-2h11" /><path d="M4 7h16a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M16 14h.01" /></>,
    trendingUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6" /><path d="M4.22 4.22l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6" /></>,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function StatCard({ label, value, change, accent = 'green', icon }) {
  return (
    <div className="stat-card">
      {icon && <span className="stat-icon">{icon}</span>}
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
      </div>
      <span className={`change ${accent}`}>{change}</span>
    </div>
  )
}

export default function App() {
  const [config, setConfig] = useState({
    symbol: 'SOL/USDT',
    lower_price: '',
    upper_price: '',
    grid_levels: '',
    investment_amount: '',
    is_active: false,
    entry_price: '',
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(null)

  useEffect(() => {
    fetchConfig()
    fetchOrders()
  }, [])

  useEffect(() => {
    if (config.symbol) {
      fetchMarketQuote(config.symbol)
    }
  }, [config.symbol])

  async function callGridBot(action, payload = {}) {
    try {
      const { data, error } = await supabase.functions.invoke('grid-bot', {
        body: {
          action,
          ...payload,
        },
      })

      if (error) {
        throw new Error(error.message || 'Error al invocar la Edge Function')
      }

      return data
    } catch (error) {
      throw error
    }
  }

  async function fetchConfig() {
    const { data, error } = await supabase.from('grid_config').select('*').eq('id', 1).single()
    if (error) {
      console.warn('grid_config not ready yet:', error.message)
      return
    }
    if (data) setConfig(current => ({ ...current, ...data }))
  }

  async function fetchOrders() {
    const { data } = await supabase.from('grid_orders').select('*').order('created_at', { ascending: false }).limit(10)
    if (data) setOrders(data)
  }

  async function fetchMarketQuote(symbol) {
    try {
      const data = await callGridBot('quote', { symbol })
      if (data?.price) {
        setCurrentPrice(Number(data.price))
      }
    } catch (error) {
      console.warn('No se pudo obtener precio desde la Edge Function:', error)
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    setLoading(true)
    setNotice('')

    try {
      const { error } = await supabase.from('grid_config').update({
        symbol: config.symbol,
        lower_price: parseFloat(config.lower_price) || 0,
        upper_price: parseFloat(config.upper_price) || 0,
        grid_levels: parseInt(config.grid_levels) || 0,
        investment_amount: parseFloat(config.investment_amount) || 0,
        entry_price: parseFloat(config.entry_price) || 0,
        is_active: config.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', 1)

      if (error) throw error

      setNotice('✓ Configuración guardada')
      await fetchOrders()
    } catch (error) {
      setNotice(`Error: ${error.message}`)
    } finally {
      setLoading(false)
      setTimeout(() => setNotice(''), 3500)
    }
  }

  async function toggleBot(nextValue) {
    setLoading(true)
    setNotice('')

    try {
      const action = nextValue ? 'start' : 'stop'
      const payload = {
        symbol: config.symbol,
        lower_price: Number(config.lower_price || 0),
        upper_price: Number(config.upper_price || 0),
        grid_levels: Number(config.grid_levels || 0),
        investment_amount: Number(config.investment_amount || 0),
        entry_price: Number(config.entry_price || 0),
      }

      const result = await callGridBot(action, payload)
      setConfig(current => ({ ...current, is_active: nextValue }))
      setNotice(result?.message || (nextValue ? 'Bot activado' : 'Bot detenido'))
    } catch (error) {
      setNotice(`Error: ${error.message}`)
    } finally {
      setLoading(false)
      setTimeout(() => setNotice(''), 3500)
    }
  }

  const invested = Number(config.investment_amount) || 0
  const lowPrice = Number(config.lower_price) || 0
  const highPrice = Number(config.upper_price) || 0
  const entryPrice = Number(config.entry_price) || 0
  const range = lowPrice && highPrice ? `${lowPrice.toLocaleString()} – ${highPrice.toLocaleString()} USDT` : 'Configura el rango de precio'
  const pnl = currentPrice && lowPrice && highPrice ? ((currentPrice - lowPrice) / lowPrice * 100).toFixed(2) : '0.00'
  const pnlColor = Number(pnl) > 0 ? 'green' : 'red'

  const setField = (field, value) => setConfig(current => ({ ...current, [field]: value }))

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">BG</div><span>BitGrid<span className="brand-accent">PRO</span></span></div>
        <div className="account-pill"><div className="avatar">P</div><div><b>pepefauce</b><small>Grid Trading</small></div></div>
        <nav>
          <p className="nav-title">DASHBOARD</p>
          <a className="nav-link active"><Icon name="grid" /> Panel General</a>
          <a className="nav-link"><Icon name="chart" /> Análisis</a>
          <a className="nav-link"><Icon name="clock" /> Historial</a>
          <p className="nav-title">GESTIÓN</p>
          <a className="nav-link"><Icon name="sliders" /> Estrategias</a>
          <a className="nav-link"><Icon name="wallet" /> Cartera</a>
          <a className="nav-link"><Icon name="settings" /> Configuración</a>
        </nav>
        <div className="side-footer"><div className="secure-dot" />Conexión segura<small>v1.2.0</small></div>
      </aside>

      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      <main className="main-content">
        <header className="topbar">
          <div><h1>Panel General</h1><p>Estado en vivo de tu bot de trading</p></div>
          <div className="top-actions">
            <div className="price-ticker"><span className="ticker-label">{config.symbol}</span><strong>${currentPrice?.toLocaleString() || '—'}</strong><span className={`ticker-change ${pnlColor}`}>{pnl > 0 ? '+' : ''}{pnl}%</span></div>
            <button className="icon-button"><Icon name="bell" /></button>
            <div className="top-avatar">P</div>
          </div>
        </header>

        <div className="status-banner">
          <div className={`status-icon ${config.is_active ? 'online' : ''}`}><span /></div>
          <div><b>Bot {config.is_active ? 'ACTIVO' : 'PAUSADO'}</b><p>{config.is_active ? 'Ejecutando estrategia de grid en tiempo real' : 'Activa el bot para comenzar a operar'}</p></div>
          <button
            className={`banner-button ${config.is_active ? 'pause' : 'play'}`}
            onClick={() => toggleBot(!config.is_active)}
            disabled={loading}
          >
            {config.is_active ? '⏸ Pausar' : '▶ Activar'}
          </button>
        </div>

        <div className="stats-grid">
          <StatCard icon="💰" label="Capital Invertido" value={`${invested.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`} change="Pool activo" accent="neutral" />
          <StatCard icon="📈" label="P/L Total" value={invested > 0 ? `+${(invested * 0.032).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT` : '0.00 USDT'} change={invested > 0 ? '+3.2%' : '0%'} accent={invested > 0 ? 'green' : 'neutral'} />
          <StatCard icon="🎯" label="Órdenes Ejecutadas" value={orders.length.toString().padStart(2, '0')} change="Últimas 24h" accent="neutral" />
          <StatCard icon="🔄" label="Rango de Precios" value={highPrice ? `$${highPrice.toLocaleString()}` : '—'} change={lowPrice ? `desde $${lowPrice.toLocaleString()}` : 'Configura rango'} accent="neutral" />
        </div>

        <div className="workspace-grid">
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div><h2>Gráfica de Rendimiento</h2><p>Evolución acumulada de tu estrategia</p></div>
              <select className="period-select"><option>7 días</option><option>30 días</option><option>90 días</option></select>
            </div>
            <div className="chart-area">
              <div className="chart-y"><span>+8%</span><span>+4%</span><span>0%</span><span>-4%</span></div>
              <div className="line-chart">
                <div className="chart-grid" />
                <svg viewBox="0 0 700 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradientFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#16d4a0" stopOpacity=".25" />
                      <stop offset="1" stopColor="#16d4a0" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 140 Q87 110 175 95 T350 120 T525 75 L700 50 L700 200 L0 200Z" fill="url(#gradientFill)" />
                  <path d="M0 140 Q87 110 175 95 T350 120 T525 75 L700 50" fill="none" stroke="#16d4a0" strokeWidth="2.5" />
                </svg>
                <div className="chart-x"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>
              </div>
            </div>
          </section>

          <section className="panel strategy-panel">
            <div className="panel-heading">
              <div><h2>Estrategia Activa</h2><p>Detalles de configuración</p></div>
              <span className={`tag ${config.is_active ? 'tag-active' : 'tag-paused'}`}>{config.is_active ? '● ACTIVA' : '○ PAUSADA'}</span>
            </div>
            <div className="strategy-card">
              <div className="coin-row">
                <div className="coin sol">S</div>
                <div><b>{config.symbol}</b><small>Grid Trading</small></div>
                <div className="coin-value">{currentPrice ? `$${currentPrice}` : '—'}</div>
              </div>
              <div className="divider" />
              <div className="info-block">
                <div className="info-row"><span>Rango de precios</span><strong>{range}</strong></div>
                <div className="info-row"><span>Precio de entrada</span><strong>{entryPrice ? `$${entryPrice.toLocaleString()}` : '—'}</strong></div>
                <div className="info-row"><span>Niveles de grid</span><strong>{config.grid_levels || '—'} niveles</strong></div>
                <div className="info-row"><span>Inversión total</span><strong>{invested.toLocaleString()} USDT</strong></div>
                <div className="info-row highlight"><span>Precio actual</span><strong className={pnlColor}>${currentPrice?.toLocaleString() || '—'}</strong></div>
              </div>
            </div>
            <button className="ghost-button" onClick={() => document.getElementById('config-form')?.scrollIntoView({ behavior: 'smooth' })}><Icon name="sliders" size={14} /> Ajustar Estrategia</button>
          </section>
        </div>

        <div className="bottom-grid">
          <section className="panel activity-panel">
            <div className="panel-heading">
              <div><h2>Actividad Reciente</h2><p>Últimas órdenes ejecutadas</p></div>
              <button className="link-button">Ver historial <Icon name="arrow" size={14} /></button>
            </div>
            {orders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <b>Sin actividad aún</b>
                <span>Las órdenes ejecutadas aparecerán aquí</span>
              </div>
            ) : (
              <div className="order-list">
                {orders.slice(0, 6).map(order => (
                  <div className={`order-item ${order.order_type === 'SELL' ? 'sell' : ''}`} key={order.id}>
                    <div className="order-info">
                      <span className={`order-type ${order.order_type.toLowerCase()}`}>{order.order_type}</span>
                      <div className="order-details"><span>{order.price} USDT</span><small>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>
                    </div>
                    <span className="order-amount">{order.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel config-panel" id="config-form">
            <div className="panel-heading"><div><h2>Configurar Bot</h2><p>Ajusta los parámetros</p></div></div>
            <form onSubmit={handleSave} className="form-grid">
              <label className="form-group">
                <span>Par de Trading</span>
                <select value={config.symbol} onChange={e => setField('symbol', e.target.value)}>
                  {symbols.map(symbol => <option key={symbol}>{symbol}</option>)}
                </select>
              </label>

              <div className="form-row">
                <label className="form-group"><span>Precio Inferior</span><input type="number" step="0.01" placeholder="0.00" value={config.lower_price} onChange={e => setField('lower_price', e.target.value)} /></label>
                <label className="form-group"><span>Precio Superior</span><input type="number" step="0.01" placeholder="0.00" value={config.upper_price} onChange={e => setField('upper_price', e.target.value)} /></label>
              </div>

              <div className="form-row">
                <label className="form-group"><span>Precio de Entrada</span><input type="number" step="0.01" placeholder="0.00" value={config.entry_price} onChange={e => setField('entry_price', e.target.value)} /></label>
                <label className="form-group"><span>Inversión (USDT)</span><input type="number" step="0.01" placeholder="0.00" value={config.investment_amount} onChange={e => setField('investment_amount', e.target.value)} /></label>
              </div>

              <div className="form-row">
                <label className="form-group"><span>Niveles de Grid</span><input type="number" placeholder="10" value={config.grid_levels} onChange={e => setField('grid_levels', e.target.value)} /></label>
                <label className="form-group"><span>Toggle</span>
                  <div className="toggle-inline">
                    <input type="checkbox" checked={config.is_active} onChange={async e => { await toggleBot(e.target.checked) }} />
                    <span>Activar bot automático</span>
                  </div>
                </label>
              </div>

              <button className="primary-button" type="submit" disabled={loading}>{loading ? '⏳ Guardando...' : '✓ Guardar Cambios'}</button>
              {notice && <div className={`notice ${notice.includes('Error') ? 'error' : ''}`}>{notice}</div>}
            </form>
          </section>
        </div>

        <footer className="app-footer">© 2026 BitGrid Pro • Operar criptomonedas con responsabilidad • v1.2.0</footer>
      </main>
    </div>
  )
}

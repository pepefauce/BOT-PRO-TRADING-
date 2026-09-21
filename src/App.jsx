import { useEffect, useMemo, useState } from 'react'
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
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function StatCard({ label, value, change, accent = 'green' }) {
  return <div className="stat-card">
    <span className="stat-label">{label}</span>
    <strong>{value}</strong>
    <span className={`change ${accent}`}>{change}</span>
  </div>
}

export default function App() {
  const [config, setConfig] = useState({ symbol: 'SOL/USDT', lower_price: '', upper_price: '', grid_levels: '', investment_amount: '', is_active: false })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { fetchConfig(); fetchOrders() }, [])

  async function fetchConfig() {
    const { data } = await supabase.from('grid_config').select('*').eq('id', 1).single()
    if (data) setConfig(data)
  }

  async function fetchOrders() {
    const { data } = await supabase.from('grid_orders').select('*').order('created_at', { ascending: false }).limit(10)
    if (data) setOrders(data)
  }

  async function handleSave(event) {
    event.preventDefault()
    setLoading(true)
    setNotice('')
    const { error } = await supabase.from('grid_config').update({
      symbol: config.symbol,
      lower_price: parseFloat(config.lower_price) || 0,
      upper_price: parseFloat(config.upper_price) || 0,
      grid_levels: parseInt(config.grid_levels) || 0,
      investment_amount: parseFloat(config.investment_amount) || 0,
      is_active: config.is_active,
      updated_at: new Date(),
    }).eq('id', 1)
    setLoading(false)
    setNotice(error ? `Error al guardar: ${error.message}` : 'Configuración guardada correctamente')
    if (!error) setTimeout(() => setNotice(''), 3500)
  }

  const invested = Number(config.investment_amount) || 0
  const range = useMemo(() => {
    const low = Number(config.lower_price) || 0
    const high = Number(config.upper_price) || 0
    return low && high ? `${low.toLocaleString()} — ${high.toLocaleString()} USDT` : 'Configura el rango de precio'
  }, [config.lower_price, config.upper_price])

  const setField = (field, value) => setConfig(current => ({ ...current, [field]: value }))

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">B</div><span>BIT<span className="brand-accent">GRID</span></span></div>
      <div className="account-pill"><div className="avatar">P</div><div><b>Pepefauce</b><small>Cuenta principal</small></div><span className="chevron">⌄</span></div>
      <nav>
        <p className="nav-title">MENÚ PRINCIPAL</p>
        <a className="nav-link active"><Icon name="grid" /> Panel general</a>
        <a className="nav-link"><Icon name="chart" /> Mercado</a>
        <a className="nav-link"><Icon name="sliders" /> Mis estrategias</a>
        <a className="nav-link"><Icon name="clock" /> Historial</a>
        <p className="nav-title second">CUENTA</p>
        <a className="nav-link"><Icon name="wallet" /> Billetera</a>
        <a className="nav-link"><Icon name="help" /> Centro de ayuda</a>
      </nav>
      <div className="side-footer"><div className="secure-dot" /> <span>Conexión segura</span><small>v1.0.0</small></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><h1>Panel general</h1><p>Bienvenido de nuevo, Pepefauce</p></div><div className="top-actions"><button className="icon-button"><Icon name="bell" /></button><div className="top-avatar">P</div></div></header>

      <section className="status-banner"><div className={`status-icon ${config.is_active ? 'online' : ''}`}><span /></div><div><b>Bot de trading {config.is_active ? 'activo' : 'en pausa'}</b><p>{config.is_active ? 'Ejecutando estrategia automáticamente' : 'Actívalo para comenzar a operar'}</p></div><button className="outline-button" onClick={() => setField('is_active', !config.is_active)}>{config.is_active ? 'Pausar bot' : 'Activar bot'} <Icon name="arrow" size={15} /></button></section>

      <div className="stats-grid">
        <StatCard label="Capital asignado" value={`${invested.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`} change="Cuenta spot" accent="neutral" />
        <StatCard label="Rendimiento total" value="+0.00 USDT" change="+0.00%" />
        <StatCard label="Órdenes ejecutadas" value={orders.length.toString().padStart(2, '0')} change="Últimas 24 horas" accent="neutral" />
        <StatCard label="Precio actual" value="— USDT" change={config.symbol} accent="neutral" />
      </div>

      <div className="workspace-grid">
        <section className="panel chart-panel"><div className="panel-heading"><div><h2>Rendimiento de la estrategia</h2><p>Resultado acumulado del bot</p></div><select className="period-select"><option>Últimos 7 días</option><option>Últimos 30 días</option></select></div><div className="chart-area"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="line-chart"><div className="chart-grid" /><svg viewBox="0 0 700 230" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#18c78e" stopOpacity=".22" /><stop offset="1" stopColor="#18c78e" stopOpacity="0" /></linearGradient></defs><path d="M0 190 C55 194 75 166 125 177 S185 142 220 158 S270 108 310 130 S360 120 390 137 S445 88 480 108 S530 97 560 72 S625 82 700 38 L700 230 L0 230Z" fill="url(#fill)" /><path d="M0 190 C55 194 75 166 125 177 S185 142 220 158 S270 108 310 130 S360 120 390 137 S445 88 480 108 S530 97 560 72 S625 82 700 38" fill="none" stroke="#19c98f" strokeWidth="3" /></svg><div className="chart-x"><span>Lun 15</span><span>Mar 16</span><span>Mié 17</span><span>Jue 18</span><span>Vie 19</span><span>Sáb 20</span><span>Dom 21</span></div></div></div></section>

        <section className="panel strategy-summary"><div className="panel-heading"><div><h2>Estrategia activa</h2><p>Resumen de configuración</p></div><span className={`tag ${config.is_active ? 'tag-green' : 'tag-gray'}`}>{config.is_active ? 'ACTIVA' : 'PAUSADA'}</span></div><div className="pair-row"><div className="coin sol">S</div><div><b>{config.symbol}</b><small>Grid Trading</small></div><strong>—</strong></div><div className="summary-list"><div><span>Rango de precios</span><b>{range}</b></div><div><span>Niveles de grid</span><b>{config.grid_levels || '—'} niveles</b></div><div><span>Inversión total</span><b>{invested.toLocaleString()} USDT</b></div></div><button className="ghost-button" onClick={() => document.getElementById('strategy-form')?.scrollIntoView({ behavior: 'smooth' })}>Editar estrategia <Icon name="arrow" size={15} /></button></section>
      </div>

      <div className="bottom-grid"><section className="panel orders-panel"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Últimas órdenes ejecutadas</p></div><button className="link-button">Ver todo <Icon name="arrow" size={14} /></button></div>{orders.length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name="clock" size={22} /></div><b>Aún no hay actividad</b><span>Las órdenes del bot aparecerán aquí.</span></div> : <div className="order-table"><div className="table-row table-head"><span>TIPO</span><span>PRECIO</span><span>CANTIDAD</span><span>FECHA</span></div>{orders.map(order => <div className="table-row" key={order.id}><span><i className={`order-dot ${order.order_type === 'BUY' ? 'buy' : 'sell'}`} />{order.order_type}</span><span>{order.price} USDT</span><span>{order.amount}</span><span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>)}</div>}</section>
        <section className="panel form-panel" id="strategy-form"><div className="panel-heading"><div><h2>Configurar estrategia</h2><p>Ajusta los parámetros de tu bot</p></div></div><form onSubmit={handleSave}><label>Par de trading<select value={config.symbol} onChange={e => setField('symbol', e.target.value)}>{symbols.map(symbol => <option key={symbol}>{symbol}</option>)}</select></label><div className="form-two"><label>Precio inferior<input type="number" step="any" placeholder="0.00" value={config.lower_price} onChange={e => setField('lower_price', e.target.value)} /></label><label>Precio superior<input type="number" step="any" placeholder="0.00" value={config.upper_price} onChange={e => setField('upper_price', e.target.value)} /></label></div><div className="form-two"><label>Niveles<input type="number" placeholder="Ej: 10" value={config.grid_levels} onChange={e => setField('grid_levels', e.target.value)} /></label><label>Inversión (USDT)<input type="number" step="any" placeholder="0.00" value={config.investment_amount} onChange={e => setField('investment_amount', e.target.value)} /></label></div><label className="toggle-row"><input type="checkbox" checked={config.is_active} onChange={e => setField('is_active', e.target.checked)} /><span className="toggle" /><span>Activar ejecución automática</span></label><button className="primary-button" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar cambios'} <Icon name="arrow" size={16} /></button>{notice && <div className={`notice ${notice.startsWith('Error') ? 'error' : ''}`}>{notice}</div>}</form></section></div>
      <footer>© 2026 BitGrid <span>���</span> Operar criptomonedas con responsabilidad</footer>
    </main>
  </div>
}

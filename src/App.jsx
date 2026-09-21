import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uobidovyaioslvxggkeg.supabase.co'
const supabaseKey = 'sb_publishable_nWuMe_iB5TBEH38oRIqFpA_fxbjI-pJ'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function App() {
  const [config, setConfig] = useState({
    symbol: 'SOL/USDT',
    lower_price: '',
    upper_price: '',
    grid_levels: '',
    investment_amount: '',
    is_active: false
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchConfig()
    fetchOrders()
  }, [])

  async function fetchConfig() {
    const { data } = await supabase
      .from('grid_config')
      .select('*')
      .eq('id', 1)
      .single()
    if (data) setConfig(data)
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('grid_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setOrders(data)
  }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase
      .from('grid_config')
      .update({
        symbol: config.symbol,
        lower_price: parseFloat(config.lower_price) || 0,
        upper_price: parseFloat(config.upper_price) || 0,
        grid_levels: parseInt(config.grid_levels) || 0,
        investment_amount: parseFloat(config.investment_amount) || 0,
        is_active: config.is_active,
        updated_at: new Date()
      })
      .eq('id', 1)

    setLoading(false)
    if (!error) alert('¡Configuración guardada con éxito!')
    else alert('Error al guardar: ' + error.message)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0b0e14] text-slate-100 p-4 font-sans antialiased">
      {/* Cabecera Estilo Exchange */}
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
            BX
          </div>
          <h1 className="text-base font-bold tracking-tight text-white">Grid Bot Pro</h1>
        </div>
        <div className={`px-3 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${
          config.is_active 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
            : 'bg-slate-900 text-slate-400 border-slate-800'
        }`}>
          <span className={`w-2 h-2 rounded-full ${config.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
          {config.is_active ? 'Online' : 'Pausado'}
        </div>
      </div>

      {/* Tarjeta de Resumen Financiero */}
      <div className="bg-[#121821] border border-slate-800/80 rounded-xl p-4 mb-5 shadow-inner">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Inversión Asignada</span>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">USDT Pool</span>
        </div>
        <div className="text-2xl font-black font-mono tracking-tight text-white">
          {config.investment_amount ? Number(config.investment_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'} 
          <span className="text-xs font-normal text-slate-400 ml-1.5">USDT</span>
        </div>
      </div>

      {/* Formulario de Configuración */}
      <form onSubmit={handleSave} className="bg-[#121821] border border-slate-800/80 rounded-xl p-4 space-y-4 shadow-xl">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1">Parámetros de Grilla</div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Par de Trading</label>
          <select 
            value={config.symbol} 
            onChange={e => setConfig({...config, symbol: e.target.value})}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm font-semibold focus:outline-none focus:border-amber-500 text-slate-100"
          >
            <option value="SOL/USDT">SOL/USDT</option>
            <option value="DOGE/USDT">DOGE/USDT</option>
            <option value="TRX/USDT">TRX/USDT</option>
            <option value="ARB/USDT">ARB/USDT</option>
            <option value="ETH/USDT">ETH/USDT</option>
            <option value="BTC/USDT">BTC/USDT</option>
            <option value="USDC/USDT">USDC/USDT</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Precio Inferior</label>
            <input 
              type="number" 
              step="any" 
              placeholder="0.00" 
              value={config.lower_price} 
              onChange={e => setConfig({...config, lower_price: e.target.value})} 
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-amber-500 text-slate-100" 
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Precio Superior</label>
            <input 
              type="number" 
              step="any" 
              placeholder="0.00" 
              value={config.upper_price} 
              onChange={e => setConfig({...config, upper_price: e.target.value})} 
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-amber-500 text-slate-100" 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Niveles</label>
            <input 
              type="number" 
              placeholder="Ej: 10" 
              value={config.grid_levels} 
              onChange={e => setConfig({...config, grid_levels: e.target.value})} 
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-amber-500 text-slate-100" 
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Inversión Total</label>
            <input 
              type="number" 
              step="any" 
              placeholder="0.00" 
              value={config.investment_amount} 
              onChange={e => setConfig({...config, investment_amount: e.target.value})} 
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-amber-500 text-slate-100" 
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60">
          <input 
            type="checkbox" 
            id="is_active"
            checked={config.is_active} 
            onChange={e => setConfig({...config, is_active: e.target.checked})} 
            className="w-4 h-4 rounded bg-[#0b0e14] border-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="is_active" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
            Habilitar ejecución automática en la red
          </label>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50 cursor-pointer text-sm"
        >
          {loading ? 'Guardando...' : 'Actualizar Configuración'}
        </button>
      </form>

      {/* Historial de Órdenes */}
      <div className="mt-5 bg-[#121821] border border-slate-800/80 rounded-xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial ({config.symbol})</h3>
          <span className="text-[10px] text-slate-500">Últimas 10</span>
        </div>
        
        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6 font-mono">Sin órdenes registradas en el libro.</p>
        ) : (
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className="flex justify-between items-center bg-[#0b0e14] p-3 rounded-lg border border-slate-800/50 text-xs font-mono">
                <div>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${o.order_type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {o.order_type}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(o.created_at).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-200">{o.price} USDT</p>
                  <p className="text-[10px] text-slate-400">Vol: {o.amount}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

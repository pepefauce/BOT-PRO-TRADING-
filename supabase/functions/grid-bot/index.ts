import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { ethers } from 'npm:ethers@6.13.5'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' }
const routerAbi = [
  'function getAmountsOut(uint amountIn,address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)',
]
const erc20Abi = [
  'function allowance(address owner,address spender) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

const env = (name: string, required = true) => {
  const value = Deno.env.get(name)
  if (required && !value) throw new Error(`Falta el secret ${name}`)
  return value || ''
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: cors })
const okAddress = (value: string) => ethers.isAddress(value)

function fibonacciLevels(entry: number, low: number, high: number, count: number) {
  if (!(low > 0 && high > low && entry >= low && entry <= high)) throw new Error('Rango inválido: lower_price < entry_price < upper_price')
  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786, 1]
  const selected = ratios.slice(0, Math.max(1, Math.min(count, ratios.length)))
  const lower = selected.map(r => ({ side: 'BUY', ratio: r, price: entry - (entry - low) * r }))
  const upper = selected.map(r => ({ side: 'SELL', ratio: r, price: entry + (high - entry) * r }))
  return [...lower, ...upper].filter(level => level.price >= low && level.price <= high).sort((a, b) => a.price - b.price)
}

async function main(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const body = await req.json().catch(() => ({}))
  const action = body.action || 'tick'
  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
  const rpc = new ethers.JsonRpcProvider(env('BSC_RPC_URL'), 56)
  const wallet = new ethers.Wallet(env('TRADING_WALLET_PRIVATE_KEY'), rpc)
  const walletAddress = (env('TRADING_WALLET_ADDRESS', false) || wallet.address).toLowerCase()
  if (wallet.address.toLowerCase() !== walletAddress) throw new Error('TRADING_WALLET_ADDRESS no coincide con la llave privada')
  const routerAddress = env('PANCAKE_ROUTER_ADDRESS', false) || '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  const router = new ethers.Contract(routerAddress, routerAbi, wallet)

  if (action === 'start' || action === 'stop') {
    const active = action === 'start'
    const { error } = await supabase.from('grid_config').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) throw error
    return json(200, { ok: true, is_active: active, message: active ? 'Bot activado' : 'Bot detenido' })
  }

  const { data: config, error: configError } = await supabase.from('grid_config').select('*').eq('id', 1).single()
  if (configError || !config) throw new Error('No existe grid_config con id=1')
  const tokenMap = JSON.parse(env('PANCAKE_TOKEN_MAP_JSON'))
  const pair = tokenMap[config.symbol]
  if (!pair || !okAddress(pair.base) || !okAddress(pair.quote)) throw new Error(`No hay tokens configurados para ${config.symbol}`)
  const base = new ethers.Contract(pair.base, erc20Abi, wallet)
  const quote = new ethers.Contract(pair.quote, erc20Abi, wallet)
  const baseDecimals = Number(pair.baseDecimals ?? await base.decimals())
  const quoteDecimals = Number(pair.quoteDecimals ?? await quote.decimals())
  const oneBase = ethers.parseUnits('1', baseDecimals)
  const quoteForOneBase = (await router.getAmountsOut(oneBase, [pair.base, pair.quote]))[1]
  const price = Number(ethers.formatUnits(quoteForOneBase, quoteDecimals))

  if (action === 'quote') return json(200, { ok: true, symbol: config.symbol, price })
  if (!config.is_active) return json(200, { ok: true, skipped: true, reason: 'Bot pausado', price })
  if (env('LIVE_TRADING_ENABLED', false).toLowerCase() !== 'true') return json(200, { ok: true, dryRun: true, price, message: 'Dry-run: LIVE_TRADING_ENABLED no está en true' })

  const entry = Number(config.entry_price || 0)
  const low = Number(config.lower_price || 0)
  const high = Number(config.upper_price || 0)
  const levels = fibonacciLevels(entry, low, high, Number(config.grid_levels || 6))
  const { data: state } = await supabase.from('bot_state').select('*').eq('id', 1).maybeSingle()
  const firstBuyDone = Boolean(state?.first_buy_done)
  const triggered = new Set<string>(state?.triggered_levels || [])
  const initialPercent = Number(config.initial_order_percent || 40)
  const orderPercent = Number(config.order_percent || 10)
  const investment = Number(config.investment_amount || 0)
  const tolerance = Number(config.level_tolerance_percent || 0.15) / 100
  let selected = null as any

  if (!firstBuyDone) {
    if (price > entry || price < low || price > high) return json(200, { ok: true, skipped: true, reason: 'Esperando precio de entrada', price, entry })
    selected = { id: 'initial', side: 'BUY', price: entry, amountUsdt: investment * initialPercent / 100 }
  } else {
    for (const level of levels) {
      const id = `${level.side}-${level.ratio}`
      if (triggered.has(id) || Math.abs(price - level.price) / level.price > tolerance) continue
      selected = { id, side: level.side, price: level.price, amountUsdt: investment * orderPercent / 100 }
      break
    }
  }
  if (!selected || selected.amountUsdt <= 0) return json(200, { ok: true, skipped: true, reason: 'Sin nivel activado', price })

  const slippageBps = Number(env('SLIPPAGE_BPS', false) || 50)
  const amountUsdt = ethers.parseUnits(selected.amountUsdt.toFixed(quoteDecimals), quoteDecimals)
  let amountIn: bigint
  let path: string[]
  let tokenIn: any
  if (selected.side === 'BUY') {
    amountIn = amountUsdt; path = [pair.quote, pair.base]; tokenIn = quote
  } else {
    const baseAmount = (await base.balanceOf(walletAddress))
    const estimated = (await router.getAmountsOut(amountUsdt, [pair.quote, pair.base]))[1]
    amountIn = estimated < baseAmount ? estimated : baseAmount
    path = [pair.base, pair.quote]; tokenIn = base
  }
  if (amountIn <= 0n) return json(200, { ok: true, skipped: true, reason: 'Balance insuficiente', price })
  const allowance = await tokenIn.allowance(walletAddress, routerAddress)
  if (allowance < amountIn) {
    const approval = await (await tokenIn.approve(routerAddress, ethers.MaxUint256)).wait()
    if (!approval) throw new Error('No se confirmó la aprobación del token')
  }
  const quoted = (await router.getAmountsOut(amountIn, path))[1]
  const minOut = quoted * BigInt(10000 - slippageBps) / 10000n
  const deadline = Math.floor(Date.now() / 1000) + 120
  const tx = await router.swapExactTokensForTokens(amountIn, minOut, path, walletAddress, deadline)
  const receipt = await tx.wait()
  if (!receipt) throw new Error('La transacción no fue confirmada')
  const levelId = selected.id
  const nextState = { id: 1, first_buy_done: firstBuyDone || selected.side === 'BUY', triggered_levels: [...triggered, levelId], last_price: price, last_tx_hash: tx.hash, updated_at: new Date().toISOString() }
  await supabase.from('bot_state').upsert(nextState)
  await supabase.from('grid_orders').insert({ symbol: config.symbol, order_type: selected.side, price: selected.price, amount: Number(ethers.formatUnits(amountIn, selected.side === 'BUY' ? quoteDecimals : baseDecimals)), tx_hash: tx.hash, created_at: new Date().toISOString() })
  return json(200, { ok: true, executed: true, side: selected.side, price, txHash: tx.hash })
}

Deno.serve(async req => {
  try { return await main(req) } catch (error) { console.error(error); return json(400, { ok: false, error: error instanceof Error ? error.message : 'Error desconocido' }) }
})

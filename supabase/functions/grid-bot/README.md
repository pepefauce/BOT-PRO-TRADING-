# PancakeSwap Spot Fibonacci Bot

La función `grid-bot` usa un wallet dedicado en BNB Chain y PancakeSwap V2. No usa Bitunix.

## Secrets de Supabase

Configura estos secrets; `BSC_RPC_URL` puede ser un RPC público gratuito, aunque uno dedicado suele ser más estable:

```text
BSC_RPC_URL=https://bsc-dataseed.binance.org/
TRADING_WALLET_PRIVATE_KEY=...
TRADING_WALLET_ADDRESS=0x...
PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E
PANCAKE_TOKEN_MAP_JSON={"SOL/USDT":{"base":"0x...","quote":"0x55d398326f99059fF775485246999027B3197955","baseDecimals":18,"quoteDecimals":18}}
SLIPPAGE_BPS=50
LIVE_TRADING_ENABLED=false
```

`TRADING_WALLET_PRIVATE_KEY` nunca se coloca en React ni en GitHub. Usa una wallet dedicada, sin permisos de retiro en servicios externos, y prueba primero con `LIVE_TRADING_ENABLED=false`.

## Despliegue

```bash
supabase db push
supabase secrets set BSC_RPC_URL=... TRADING_WALLET_PRIVATE_KEY=... TRADING_WALLET_ADDRESS=... PANCAKE_TOKEN_MAP_JSON='...'
supabase functions deploy grid-bot --no-verify-jwt
```

`start` y `stop` solo cambian `grid_config.is_active`. `tick` hace como máximo una operación por llamada. Programa `tick` con Supabase Cron cada minuto o invócalo desde un worker. No ejecutes `tick` concurrentemente.

La función espera que `grid_config` tenga `entry_price`, `initial_order_percent`, `order_percent` y `level_tolerance_percent`. La primera compra ocurre cuando el precio está entre `entry_price` y el rango; después se consumen niveles Fibonacci de compra y venta.

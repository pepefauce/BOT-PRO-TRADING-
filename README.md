# BOT-PRO-TRADING-

Aplicación web en React/Vite para configurar y controlar un bot de trading spot en BNB Chain mediante PancakeSwap V2 y Supabase Edge Functions.

> **Advertencia:** este proyecto puede ejecutar operaciones reales con criptomonedas. Úsalo bajo tu propia responsabilidad. Empieza siempre con `LIVE_TRADING_ENABLED=false`, una wallet dedicada y fondos de prueba.

## Stack

- React 18 + Vite
- Supabase (Database, Edge Functions y autenticación de sesión propia)
- TypeScript/Deno para la Edge Function `grid-bot`
- ethers.js para interactuar con BNB Chain y PancakeSwap V2

## Desarrollo local

Requisitos: Node.js 18+ y npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Variables públicas del frontend (`.env.local`):

```text
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

La clave `anon` puede estar en el frontend; **nunca** pongas aquí una service-role key, una private key ni ningún secreto de trading.

Para verificar la compilación:

```bash
npm run build
npm run preview
```

## Supabase y despliegue

Aplica las migraciones y configura los secretos exclusivamente en Supabase:

```bash
supabase db push
supabase secrets set \\
  BOT_LOGIN_KEY=UnaClave8 \\
  BOT_SESSION_SECRET="genera-un-secreto-largo-y-aleatorio" \\
  BSC_RPC_URL=https://bsc-dataseed.binance.org/ \\
  TRADING_WALLET_PRIVATE_KEY=... \\
  TRADING_WALLET_ADDRESS=0x... \\
  PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E \\
  PANCAKE_TOKEN_MAP_JSON='{"WBNB/USDT":{"base":"0x...","quote":"0x...","baseDecimals":18,"quoteDecimals":18}}' \\
  SLIPPAGE_BPS=50 \\
  LIVE_TRADING_ENABLED=false
supabase functions deploy grid-bot --no-verify-jwt
```

`BOT_LOGIN_KEY` debe tener exactamente 8 caracteres alfanuméricos. `TRADING_WALLET_PRIVATE_KEY` no debe aparecer jamás en React, `.env.local`, commits, issues o logs. Si se expuso alguna vez, revócala sustituyendo la wallet inmediatamente.

La función admite `login`, `start`, `stop`, `quote` y `tick`. `tick` debe programarse con Supabase Cron o un worker; realiza como máximo una operación por llamada.

## Estructura

```text
src/                         interfaz React
supabase/functions/grid-bot/ lógica server-side y ejecución en PancakeSwap
supabase/migrations/         esquema y estado persistente del bot
```

## Seguridad

Este repositorio es público a propósito. No se deben subir secretos, archivos `.env`, claves privadas, tokens de sesión ni credenciales. Revisa el historial si alguna credencial se comprometió; borrar el archivo en un commit posterior no invalida una clave filtrada.

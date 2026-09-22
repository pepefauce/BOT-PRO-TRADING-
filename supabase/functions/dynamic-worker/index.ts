// Compatibility entrypoint for the existing frontend.
// The original application invokes the Edge Function as `dynamic-worker`.
// Keep the trading implementation in one place and delegate to grid-bot.
import '../grid-bot/index.ts'

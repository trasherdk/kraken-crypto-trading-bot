
// load correct config file
const env = process.env.NODE_ENV || 'prod'
require('dotenv').config({ path: `.env.${env}` })

export interface BotConfig {
  interval: number
  pair: string
  tax: number
  blockMaturity: number
  krakenApiKey: string
  krakenApiSecret: string
}

export const config: BotConfig = {
  interval: process.env.INTERVAL ? parseFloat(process.env.INTERVAL) : 15,
  blockMaturity: process.env.BLOCK_MATURITY ? parseFloat(process.env.BLOCK_MATURITY) : 0.75,
  pair: process.env.PAIR || '',
  tax: process.env.TAX ? parseFloat(process.env.TAX) : 0.0018,
  krakenApiKey: process.env.KRAKEN_API_KEY || '',
  krakenApiSecret: process.env.KRAKEN_API_SECRET || ''
}

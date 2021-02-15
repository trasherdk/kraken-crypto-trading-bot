import KrakenClient from 'kraken-api'
import { Watcher } from './watcher'
import { Analyst } from './analyst'
import { Bot } from './bot'
import { MockKrakenService } from './mockKrakenService'
import { config } from './common/config'

// TODO: find a better way how to run a script forever
setInterval(() => { }, 10000)

console.log(config)

const krakenApi = new KrakenClient(config.krakenApiKey, config.krakenApiSecret)
const krakenService = new MockKrakenService(krakenApi, config)
//const krakenService = new KrakenService(krakenApi, config)
const watcher = new Watcher(krakenService, config)
const analyst = new Analyst(watcher, config)
const bot = new Bot(krakenService, analyst)

setTimeout(() => {
  watcher.start()
}, 1000)

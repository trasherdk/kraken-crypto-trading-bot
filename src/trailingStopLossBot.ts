import { DownswingAnalyst } from './analysts/downswingAnalyst'
import { Position, SellRecommendation } from './interfaces/trade.interface'
import { KrakenService } from './krakenService'
import { logger } from './common/logger'
import { BotConfig } from './common/config'
import { round } from 'lodash'
import { PositionsService } from './positions.service'

// TODO: this should look for 5 minutes blocks and not 15 minutes

const positionIdentifier = (position: Position) => `${position.pair}_${position.price}_${position.volume}`

// Trailing Stop/Stop-Loss
export class TrailingStopLossBot {

  constructor(
    readonly kraken: KrakenService,
    readonly analyst: DownswingAnalyst,
    readonly config: BotConfig,
    readonly repo: PositionsService
  ) {
    // load positions and start watching for sell opporunities
    this.repo.findAll().then(positions => {
      // const total = positions.reduce((acc, pos) => {
      //   return {
      //     volume: acc.volume + pos.volume,
      //     costs: acc.costs + (pos.price * pos.volume)
      //   }
      // }, { volume: 0, costs: 0 })
      // logger.debug(total.costs / total.volume)
      positions.map(position => {
        const key = `[${position.pair}_${position.price}_${position.volume}]`
        logger.info(`Start watching sell opportunity for ${key}`)
      })
    })

    // register event handler to observe SELL recommendations
    if (analyst) {
      analyst.on('ANALYST:RECOMMENDATION_TO_SELL', (data: SellRecommendation) => {
        this.handleSellRecommendation(data)
      })
    }
  }

  inWinZone(currentBidPrice: number, targetProfit: number, position: Position): boolean {
    const costs = position.price * position.volume
    const fee = costs * this.config.tax * 2
    const totalCosts = fee + costs
    const volumeToSell = round((totalCosts / currentBidPrice), 0)
    const expectedProfit = position.volume - volumeToSell

    logger.debug(`Expected profit for '${positionIdentifier(position)}': ${expectedProfit}`)

    return expectedProfit > 0 && expectedProfit >= targetProfit
  }

  async handleSellRecommendation(recommendation: SellRecommendation) {
    const currentBidPrice = await this.kraken.getBidPrice(recommendation.pair)

    this.repo.findAll().then(positions => {
      positions.forEach(position => {
        if(this.inWinZone(currentBidPrice, this.config.targetProfit, position)) {
          logger.info(`Position '${positionIdentifier(position)}' is in WIN zone. Sell now! 🤑`)
          this.sellPosition(position, currentBidPrice)
        }
        else {
          logger.info(`Unfortunately position '${positionIdentifier(position)}' is not yet in WIN zone 🤬`)
        }
      })
    })
  }

  async sellPosition(position: Position, currentBidPrice: number) {
    const costs = position.price * position.volume
    const fee = costs * this.config.tax * 2
    const totalCosts = fee + costs
    const volumeToSell = round((totalCosts / currentBidPrice), 0)
    const volumeToKeep = position.volume - volumeToSell

    logger.info(`Create SELL for ${volumeToSell} '${position.pair}' for ~ ${currentBidPrice}. Keep ${volumeToKeep}`)
    return this.kraken.createSellOrder({ pair: position.pair, volume: volumeToSell }).then(order => {
      // TODO: calculate real profit based on actual transaction data
      // TODO: remove from positions
      console.log(position)
      console.log(order)
    })
  }
}

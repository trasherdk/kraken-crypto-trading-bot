import { Analyst, ANALYST_EVENTS } from '../analysts/analyst'
import { Recommendation } from '../common/interfaces/trade.interface'
import { KrakenService } from '../kraken/krakenService'
import { logger } from '../common/logger'
import { BotConfig } from '../common/config'
import { slack } from '../slack/slack.service'
import { round } from 'lodash'
import { PositionsService } from '../positions/positions.service'
import { Position } from '../positions/position.interface'
import { formatMoney, formatNumber, positionId } from '../common/utils'
import { inWinZone } from './utils'
import { ProfitBot } from './profitBot'

// Trailing Stop/Stop-Loss
export class TrailingStopLossBot extends ProfitBot {

  constructor(
    readonly kraken: KrakenService,
    readonly positionService: PositionsService,
    readonly analyst: Analyst,
    readonly config: BotConfig,
  ) {
    super(kraken, positionService, analyst, config)

    if (analyst) {
      analyst.on(ANALYST_EVENTS.SELL, (data: Recommendation) => {
        this.handleSellRecommendation(data)
      })
    }
  }

  async createSellOrder(position: Position, currentBidPrice: number): Promise<Position | undefined> {
    if(position.buy.price && position.buy.volume) {

      const costs = position.buy.price * position.buy.volume
      const fee = costs * this.config.tax * 2
      const totalCosts = fee + costs
      const volumeToSell = round((totalCosts / currentBidPrice), 0)
      const volumeToKeep = position.buy.volume - volumeToSell

      if(volumeToKeep < 0) {
        throw Error(`Expected profit for ${positionId(position)} would be negative. Stop the sell!`)
      }

      try {
        logger.info(`Create SELL order for ${positionId(position)}. volume: ${volumeToSell}, price: ~ ${currentBidPrice}, keep: ${volumeToKeep}`)

        // update the status of the position so that we don't end up selling it multiple times
        await this.positionService.update(position, {
          'status': 'selling',
          'sell.volumeToKeep': volumeToKeep
        })

        // create SELL order with Kraken
        const orderIds = await this.kraken.createSellOrder({ pair: position.pair, volume: volumeToSell })
        logger.info(`Successfully created SELL order for ${positionId(position)}. orderIds: ${JSON.stringify(orderIds)}`)

        // mark position as sold and keep track of the orderIds
        const updatedPosition = await this.positionService.update(position, {
          'status': 'sold',
          'sell.orderIds': orderIds.map(id => id.id)
        })

        // return latest version of the position
        return updatedPosition
      }
      catch(err) {
        logger.error(`Error SELL ${positionId(position)}:`, err)
        logger.error(JSON.stringify(err))
      }
    }
  }
}

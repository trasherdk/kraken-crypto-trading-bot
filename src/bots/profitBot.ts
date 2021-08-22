import { round } from "lodash"
import { Position } from "../positions/position.interface"
import { BotConfig } from "../common/config"
import { formatMoney, positionId } from "../common/utils"
import { slack } from "../slack/slack.service"
import { logger } from '../common/logger'
import { KrakenService } from "../kraken/krakenService"
import { PositionsService } from "src/positions/positions.service"
import { Analyst } from "../analysts/analyst"
import { BuyRecommendation } from "../common/interfaces/interfaces"
import { inWinZone } from "./utils"

export class ProfitBot {

  constructor(
    readonly kraken: KrakenService,
    readonly positionService: PositionsService,
    readonly analyst: Analyst,
    readonly config: BotConfig
  ) {

  }

  async createSellOrder(position: Position, currentBidPrice: number): Promise<Position | undefined> {
    throw new Error('This method has to be implemented')
  }

  async handleSellRecommendation(recommendation: BuyRecommendation) {
    const currentBidPrice = await this.kraken.getBidPrice(recommendation.pair)
    const positions = await this.positionService.find({
      pair: this.config.pair,
      status: 'open'
    })

    for (const position of positions) {
      if(inWinZone(position, currentBidPrice, this.config.targetProfit, this.config.tax)) {
        logger.info(`Position ${positionId(position)} is in WIN zone. Sell now! 🤑`)
        await this.sellPosition(position, currentBidPrice)
      }
      else {
        logger.info(`Unfortunately position ${positionId(position)} is not yet in WIN zone 🤬`)
      }
    }
  }

  async sellPosition(position: Position, currentBidPrice: number): Promise<void> {
    let sellPosition = await this.createSellOrder(position, currentBidPrice)
    if(sellPosition) {
      let evaluatedPosition = await this.evaluateProfit(sellPosition)
      // lazy retry. how can we do that better?
      if(!evaluatedPosition) {
        evaluatedPosition = await this.evaluateProfit(sellPosition)
      }
      this.sendSlackMessage(evaluatedPosition)
    }
  }

  sendSlackMessage(position?: Position) {
    if(position) {
      const msg = `Successfully SOLD ${positionId(position)} volume ${round(position?.sell?.volume || 0)} for ${formatMoney(position?.sell?.price || 0)}`
      slack(this.config).send(msg)
    }
  }

  async evaluateProfit(position: Position) {
    try {
      logger.debug(`Fetch order details for orders '${position.sell.orderIds?.join(',')}'`)

      if(position.sell.orderIds && position.sell.orderIds.length > 0) {
        const orderId = position.sell.orderIds[0]
        const order = await this.kraken.getOrder({ id: orderId })

        if(order === undefined) {
          throw new Error(`SELL order '${JSON.stringify(orderId)}' returned 'undefined'. we need to fix this manally. Position ${positionId(position)}`)
        }

        // update position to keep track of profit
        const price = parseFloat(order.price)
        const volumeSold = parseFloat(order.vol_exec) || 0
        const updatedPosition = await this.positionService.update(position, {
          'sell.strategy': 'partial',
          'sell.price': price,
          'sell.volume': volumeSold,
        })

        logger.info(`Successfully executed SELL order of ${round(volumeSold, 0)} for ${price}`)
        logger.debug(`SELL order: ${JSON.stringify(order)}`)

        // return latest version of the position
        return updatedPosition
      }
    }
    catch(err) {
      logger.error(`Error evaluating profit for ${positionId(position)}:`, err)
    }
  }

}
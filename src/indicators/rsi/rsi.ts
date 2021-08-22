import { OHLCBlock } from '../../common/interfaces/interfaces'
import { flattenOhlcInput } from '../common/utils'
import { RSI } from 'technicalindicators'
import { round, takeRight } from 'lodash'
import { logger } from '../../common/logger'

// RSI
export const rsi = () => (blocks: OHLCBlock[]): number  => {

  const ohlc = flattenOhlcInput(blocks)
  const history = RSI.calculate({
    period: 14,
    values: ohlc.close
  })

  const rsi = takeRight(history, 1)[0]
  const confidence = rsi < 65 ? 1 : 0

  logger.debug(`RSI: [ ${round(rsi, 2)} ] => ${confidence}`)

  return confidence
}


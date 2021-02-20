import { OHLCBlock } from '../../common/interfaces/trade.interface'
import { getBlockMaturity } from './utils'
import { logger } from '../../common/logger'
import { MACD } from 'technicalindicators'
import { MACDOutput } from 'technicalindicators/declarations/moving_averages/MACD'
import { last } from 'lodash'

export interface MACDResult {
  blocks: MACDOutput[],
  period: number,
  headMaturity: number,
  isHeadMatured: boolean
}

export const histogram = (macd: MACDOutput[]): number[] =>
  macd.map(m => m.histogram ? m.histogram : 0)

export const maturedBlocks = (input: MACDResult) => {
  return input.isHeadMatured
    ? input.blocks
    : input.blocks.splice(0, input.blocks.length - 1)
}

export const calculateMACD = (period: number, requiredBlockMaturity: number, blocks: OHLCBlock[]): MACDResult => {
  const macd = MACD.calculate({
    values: blocks.map(b => b.close),
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })

  // TODO: make sure all blocks or not UNDEFINED

  const head = last(blocks)
  const headMaturity = getBlockMaturity(period, head)
  const isHeadMatured = headMaturity >= requiredBlockMaturity

  if(!isHeadMatured) {
    logger.debug(`MACD: Block maturity for period '${period}' is '${headMaturity}'. Needs to be above ${requiredBlockMaturity}.`)
  }

  return {
    blocks: macd,
    isHeadMatured,
    headMaturity,
    period,
  }
}

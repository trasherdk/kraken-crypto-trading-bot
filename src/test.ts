import { Mongoose } from 'mongoose'
import connect from './common/db/connect'
import { PositionsService } from './positions/positions.service'
import mongoose from 'mongoose'

(async function() {

  await connect('mongodb://localhost:27017/kraken-prod')

  // const service = new PositionsService()
  // const aa = await service.create({ pair: 'hans', volume: 123})
  // service.update(aa, {
  //   volumeExecuted: 2,
  //   price: 1
  // })



  mongoose.connection.collection('bets').rename('positions')



  const orderIds = [{'id':'O4KCQA-CEFYO-XSOWZ4'}, {'id':'bbb'}]
  const x = orderIds.map(orderId => orderId.id)
  console.log(x)


  // const bets = await service.findByStatus('open')
  // console.log(bets)


  // const b = bets[0]
  // b.status = 'closed'

  // service.save(b)

})()
import { Params, NullableId } from '@feathersjs/feathers'
import { Service, SequelizeServiceOptions } from 'feathers-sequelize'
import { Application } from '../../../declarations'
export class ServerSetting extends Service {
  app: Application

  constructor(options: Partial<SequelizeServiceOptions>, app: Application) {
    super(options)
    this.app = app
  }

  async find(params?: Params): Promise<any> {
    const serverSetting = (await super.find()) as any
    const data = serverSetting.data.map((el) => {
      let hub = JSON.parse(el.hub)

      if (typeof hub === 'string') hub = JSON.parse(hub)

      return {
        ...el,
        hub: hub
      }
    })

    return {
      total: serverSetting.total,
      limit: serverSetting.limit,
      skip: serverSetting.skip,
      data
    }
  }
}

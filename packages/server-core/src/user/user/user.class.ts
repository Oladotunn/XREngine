import { Forbidden } from '@feathersjs/errors'
import { Params } from '@feathersjs/feathers'
import { SequelizeServiceOptions, Service } from 'feathers-sequelize'
import { Op } from 'sequelize'
import { Application } from '../../../declarations'
import { extractLoggedInUserFromParams } from '../../user/auth-management/auth-management.utils'

/**
 * This class used to find user
 * and returns founded users
 */
export class User extends Service {
  app: Application
  docs: any

  constructor(options: Partial<SequelizeServiceOptions>, app: Application) {
    super(options)
    this.app = app
  }

  /**
   * @function find it is used to find specific users
   *
   * @param params user id
   * @returns {@Array} of found users
   */

  async find(params?: Params): Promise<any> {
    if (!params) params = {}
    if (!params.query) params.query = {}
    const { action, $skip, $limit, search, ...query } = params.query!

    const skip = $skip ? $skip : 0
    const limit = $limit ? $limit : 10

    delete query.search

    if (action === 'friends') {
      delete params.query.action
      const loggedInUser = extractLoggedInUserFromParams(params)
      const userResult = await (this.app.service('user') as any).Model.findAndCountAll({
        offset: skip,
        limit: limit,
        order: [['name', 'ASC']],
        include: [
          {
            model: (this.app.service('user-relationship') as any).Model,
            where: {
              relatedUserId: loggedInUser.id,
              userRelationshipType: 'friend'
            }
          }
        ]
      })

      params.query.id = {
        $in: userResult.rows.map((user) => user.id)
      }
      return super.find(params)
    } else if (action === 'layer-users') {
      delete params.query.action
      const loggedInUser = extractLoggedInUserFromParams(params)
      params.query.instanceId = params.query.instanceId || loggedInUser.instanceId || 'intentionalBadId'
      return super.find(params)
    } else if (action === 'channel-users') {
      delete params.query.action
      const loggedInUser = extractLoggedInUserFromParams(params)
      params.query.channelInstanceId =
        params.query.channelInstanceId || loggedInUser.channelInstanceId || 'intentionalBadId'
      return super.find(params)
    } else if (action === 'admin') {
      delete params.query.action
      delete params.query.search
      const loggedInUser = extractLoggedInUserFromParams(params)
      if (loggedInUser.userRole !== 'admin') throw new Forbidden('Must be system admin to execute this action')

      const searchedUser = await (this.app.service('user') as any).Model.findAll({
        where: {
          name: {
            [Op.like]: `%${search}%`
          }
        },
        raw: true
      })

      if (search) {
        params.query.id = {
          $in: searchedUser.map((user) => user.id)
        }
      }
      return super.find(params)
    } else if (action === 'search') {
      const searchUser = params.query.data
      delete params.query.action
      const searchedUser = await (this.app.service('user') as any).Model.findAll({
        where: {
          name: {
            [Op.like]: `%${searchUser}%`
          }
        },
        raw: true,
        nest: true
      })
      params.query.id = {
        $in: searchedUser.map((user) => user.id)
      }
      return super.find(params)
    } else if (action === 'invite-code-lookup') {
      delete params.query.action
      return super.find(params)
    } else {
      const loggedInUser = extractLoggedInUserFromParams(params)
      if (loggedInUser?.userRole !== 'admin' && params.isInternal != true)
        return new Forbidden('Must be system admin to execute this action')
      return await super.find(params)
    }
  }

  async create(params?: Params): Promise<any> {
    const data = params ?? {}
    data.inviteCode = Math.random().toString(36).slice(2)
    return await super.create(data)
  }
}

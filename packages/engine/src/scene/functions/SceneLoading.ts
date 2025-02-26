import { Engine } from '../../ecs/classes/Engine'
import { Entity } from '../../ecs/classes/Entity'
import { addComponent, getComponent, hasComponent } from '../../ecs/functions/ComponentFunctions'
import { createEntity } from '../../ecs/functions/EntityFunctions'
import { TransformComponent } from '../../transform/components/TransformComponent'
import { NameComponent } from '../components/NameComponent'
import { EntityNodeComponent } from '../components/EntityNodeComponent'
import { SceneJson, ComponentJson, EntityJson } from '@xrengine/common/src/interfaces/SceneInterface'
import { useWorld } from '../../ecs/functions/SystemHooks'
import { EntityTreeNode } from '../../ecs/classes/EntityTree'
import { updateRenderSetting, resetEngineRenderer } from './loaders/RenderSettingsFunction'
import { ScenePrefabTypes } from './registerPrefabs'
import { DisableTransformTagComponent } from '../../transform/components/DisableTransformTagComponent'
import { SceneTagComponent, SCENE_COMPONENT_SCENE_TAG } from '../components/SceneTagComponent'
import { dispatchLocal } from '../../networking/functions/dispatchFrom'
import { EngineActions } from '../../ecs/classes/EngineService'
import { Object3DComponent } from '../components/Object3DComponent'
import { ObjectLayers } from '../constants/ObjectLayers'

export const createNewEditorNode = (entity: Entity, prefabType: ScenePrefabTypes): void => {
  const world = useWorld()

  const components = world.scenePrefabRegistry.get(prefabType)
  if (!components) return console.warn(`[createNewEditorNode]: ${prefabType} is not a prefab`)

  loadSceneEntity(new EntityTreeNode(entity), { name: prefabType, components })
}

/**
 * Loads a scene from scene json
 * @param sceneData
 */
export const loadSceneFromJSON = async (sceneData: SceneJson, world = useWorld()) => {
  const entityMap = {} as { [key: string]: EntityTreeNode }
  Engine.sceneLoadPromises = []
  dispatchLocal(EngineActions.sceneLoading(true) as any)

  // reset renderer settings for if we are teleporting and the new scene does not have an override
  resetEngineRenderer(true)

  Object.keys(sceneData.entities).forEach((key) => {
    entityMap[key] = new EntityTreeNode(createEntity(), key)
    loadSceneEntity(entityMap[key], sceneData.entities[key])
  })

  const tree = world.entityTree

  Object.keys(sceneData.entities).forEach((key) => {
    const sceneEntity = sceneData.entities[key]
    const node = entityMap[key]
    tree.addEntityNode(node, sceneEntity.parent ? entityMap[sceneEntity.parent] : undefined)
  })

  addComponent(world.entityTree.rootNode.entity, Object3DComponent, { value: Engine.scene })
  addComponent(world.entityTree.rootNode.entity, SceneTagComponent, {})
  if (Engine.isEditor) {
    getComponent(world.entityTree.rootNode.entity, EntityNodeComponent).components.push(SCENE_COMPONENT_SCENE_TAG)
  }

  Engine.camera?.layers.disable(ObjectLayers.Scene)
  await Promise.all(Engine.sceneLoadPromises)
  Engine.camera?.layers.enable(ObjectLayers.Scene)

  Engine.sceneLoaded = true

  // Configure CSM
  updateRenderSetting(world.entityTree.rootNode.entity)
  dispatchLocal(EngineActions.sceneLoaded(true) as any)
}

/**
 * Loads all the components from scene json for an entity
 * @param {EntityTreeNode} entityNode
 * @param {EntityJson} sceneEntity
 */
export const loadSceneEntity = (entityNode: EntityTreeNode, sceneEntity: EntityJson): Entity => {
  addComponent(entityNode.entity, NameComponent, { name: sceneEntity.name })
  if (Engine.isEditor) addComponent(entityNode.entity, EntityNodeComponent, { components: [] })

  sceneEntity.components.forEach((component) => {
    try {
      loadComponent(entityNode.entity, component)
    } catch (e) {
      console.error(`Error loading scene entity: `, JSON.stringify(sceneEntity, null, '\t'))
      console.error(e)
    }
  })

  if (!hasComponent(entityNode.entity, TransformComponent))
    addComponent(entityNode.entity, DisableTransformTagComponent, {})

  return entityNode.entity
}

export const loadComponent = (entity: Entity, component: ComponentJson): void => {
  // remove '-1', '-2' etc suffixes
  const name = component.name.replace(/(-\d+)|(\s)/g, '')
  const world = useWorld()

  const deserializer = world.sceneLoadingRegistry.get(name)?.deserialize

  if (deserializer) {
    deserializer(entity, component)
  }
}

export const registerSceneLoadPromise = (promise: Promise<any>) => {
  Engine.sceneLoadPromises.push(promise)
  promise.then(() => {
    Engine.sceneLoadPromises.splice(Engine.sceneLoadPromises.indexOf(promise), 1)
    dispatchLocal(EngineActions.sceneEntityLoaded(Engine.sceneLoadPromises.length) as any)
  })
}

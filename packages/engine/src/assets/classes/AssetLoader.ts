import {
  FileLoader,
  MeshPhysicalMaterial,
  Object3D,
  LOD,
  TextureLoader,
  Loader,
  AnimationClip,
  Group,
  Mesh,
  LoaderUtils
} from 'three'
import { FBXLoader } from '../loaders/fbx/FBXLoader'
import { AssetType } from '../enum/AssetType'
import { AssetClass } from '../enum/AssetClass'
import { isAbsolutePath } from '../../common/functions/isAbsolutePath'
import { Engine } from '../../ecs/classes/Engine'
import { LODS_REGEXP, DEFAULT_LOD_DISTANCES } from '../constants/LoaderConstants'
import { isClient } from '../../common/functions/isClient'
import { createGLTFLoader } from '../functions/createGLTFLoader'
import { generateMeshBVH } from '../../scene/functions/bvhWorkerPool'
import type { GLTF, GLTFLoader } from '../loaders/gltf/GLTFLoader'
// import { instanceGLTF } from '../functions/transformGLTF'

/**
 * Interface for result of the GLTF Asset load.
 */
export interface LoadGLTFResultInterface {
  animations: AnimationClip[]
  scene: Object3D | Group | Mesh
  json: any
  stats: any
}

// TODO: refactor global scope
const loader = createGLTFLoader()
export function getGLTFLoader(): GLTFLoader {
  return loader
}

export function disposeDracoLoaderWorkers(): void {
  loader.dracoLoader?.dispose()
}

export const loadExtensions = async (gltf: GLTF) => {
  if (isClient) {
    const bvhTraverse: Promise<void>[] = []
    gltf.scene.traverse((mesh) => {
      bvhTraverse.push(generateMeshBVH(mesh))
    })
    await Promise.all(bvhTraverse)
  }
}

const processModelAsset = (asset: any, params: AssetLoaderParamType): void => {
  const replacedMaterials = new Map()
  asset.traverse((child) => {
    if (!child.isMesh) return

    if (typeof params.receiveShadow !== 'undefined') child.receiveShadow = params.receiveShadow
    if (typeof params.castShadow !== 'undefined') child.castShadow = params.castShadow

    if (replacedMaterials.has(child.material)) {
      child.material = replacedMaterials.get(child.material)
    } else {
      if (child.material?.userData?.gltfExtensions?.KHR_materials_clearcoat) {
        const newMaterial = new MeshPhysicalMaterial({})
        newMaterial.setValues(child.material) // to copy properties of original material
        newMaterial.clearcoat = child.material.userData.gltfExtensions.KHR_materials_clearcoat.clearcoatFactor
        newMaterial.clearcoatRoughness =
          child.material.userData.gltfExtensions.KHR_materials_clearcoat.clearcoatRoughnessFactor
        newMaterial.defines = { STANDARD: '', PHYSICAL: '' } // override if it's replaced by non PHYSICAL defines of child.material

        replacedMaterials.set(child.material, newMaterial)
        child.material = newMaterial
      }
    }
  })
  replacedMaterials.clear()

  handleLODs(asset)

  if (asset.children.length) {
    asset.children.forEach((child) => handleLODs(child))
  }
}

/**
 * Handles Level of Detail for asset.
 * @param asset Asset on which LOD will apply.
 * @returns LOD handled asset.
 */
const handleLODs = (asset: Object3D): Object3D => {
  const haveAnyLODs = !!asset.children?.find((c) => String(c.name).match(LODS_REGEXP))
  if (!haveAnyLODs) {
    return asset
  }

  const LODs = new Map<string, { object: Object3D; level: string }[]>()
  asset.children.forEach((child) => {
    const childMatch = child.name.match(LODS_REGEXP)
    if (!childMatch) {
      return
    }
    const [_, name, level]: string[] = childMatch
    if (!name || !level) {
      return
    }

    if (!LODs.has(name)) {
      LODs.set(name, [])
    }

    LODs.get(name)?.push({ object: child, level })
  })

  LODs.forEach((value, key) => {
    const lod = new LOD()
    lod.name = key
    value[0].object.parent?.add(lod)

    value.forEach(({ level, object }) => {
      lod.addLevel(object, AssetLoader.LOD_DISTANCES[level])
    })
  })

  return asset
}

/**
 * Get asset type from the asset file extension.
 * @param assetFileName Name of the Asset file.
 * @returns Asset type of the file.
 */
const getAssetType = (assetFileName: string): AssetType => {
  if (/\.(?:gltf|glb)$/.test(assetFileName)) return AssetType.glTF
  else if (/\.(?:fbx)$/.test(assetFileName)) return AssetType.FBX
  else if (/\.(?:vrm)$/.test(assetFileName)) return AssetType.VRM
  else if (/\.(?:png)$/.test(assetFileName)) return AssetType.PNG
  else if (/\.(?:jpg|jpeg|)$/.test(assetFileName)) return AssetType.JPEG
  return null!
}

/**
 * Get asset class from the asset file extension.
 * @param assetFileName Name of the Asset file.
 * @returns Asset class of the file.
 */
const getAssetClass = (assetFileName: string): AssetClass => {
  if (/\.(?:gltf|glb|vrm|fbx|obj)$/.test(assetFileName)) {
    return AssetClass.Model
  } else if (/\.png|jpg|jpeg$/.test(assetFileName)) {
    return AssetClass.Image
  } else {
    return null!
  }
}

//@ts-ignore
const fbxLoader = new FBXLoader()
const textureLoader = new TextureLoader()
const fileLoader = new FileLoader()

const getLoader = (assetType: AssetType) => {
  switch (assetType) {
    case AssetType.glTF:
    case AssetType.VRM:
      return getGLTFLoader()
    case AssetType.FBX:
      return fbxLoader
    case AssetType.PNG:
    case AssetType.JPEG:
      return textureLoader
    default:
      return fileLoader
  }
}

type AssetLoaderParamType = {
  url: string
  cache?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
  instanced?: boolean
}

const assetLoadCallback =
  (url: string, assetType: AssetType, params, onLoad: (response: any) => void) => async (model) => {
    if (assetType === AssetType.glTF || assetType === AssetType.VRM) {
      await loadExtensions(model)
    }

    let asset: any
    if (assetType === AssetType.VRM) {
      asset = model.userData.vrm
    } else {
      asset = model
    }

    const assetClass = AssetLoader.getAssetClass(url)
    if (assetClass === AssetClass.Model) {
      AssetLoader.processModelAsset(asset.scene ? asset.scene : asset, params)
      //TODO: we should probably change whichever loader this is needed for to return { scene: asset }
      params.cache && AssetLoader.Cache.set(url, asset.scene ? asset : { scene: asset })
    } else {
      params.cache && AssetLoader.Cache.set(url, asset)
    }

    if (asset.scene) {
      asset.scene.userData.type = assetType
    } else if (asset.userData) {
      asset.userData.type = assetType
    }

    onLoad(asset.scene ? asset : { scene: asset })
  }

const load = async (
  params: AssetLoaderParamType,
  onLoad = (response: any) => {},
  onProgress = (request: ProgressEvent) => {},
  onError = (event: ErrorEvent | Error) => {}
) => {
  params.cache = typeof params.cache === 'undefined' || params.cache
  if (!params.url) {
    onError(new Error('URL is empty'))
    return
  }
  const url = isAbsolutePath(params.url) ? params.url : Engine.publicPath + params.url

  if (params.cache && AssetLoader.Cache.has(url)) {
    onLoad(AssetLoader.Cache.get(url))
  }

  const assetType = AssetLoader.getAssetType(url)
  const loader = getLoader(assetType)
  const callback = assetLoadCallback(url, assetType, params, onLoad)

  try {
    // TODO: fix instancing for GLTFs
    // if (params.instanced) {
    //   ;(loader as GLTFLoader).parse(await instanceGLTF(url), null!, callback, onError)
    // } else {
    loader.load(url, callback, onProgress, onError)
    // }
  } catch (error) {
    onError(error)
  }
}

const loadAsync = async (params: AssetLoaderParamType) => {
  return new Promise<any>((resolve, reject) => {
    load(params, resolve, () => {}, resolve)
  })
}

// TODO: we are replciating code here, we should refactor AssetLoader to be entirely functional
const getFromCache = (url: string) => {
  return AssetLoader.Cache.get(isAbsolutePath(url) ? url : Engine.publicPath + url)
}

export const AssetLoader = {
  Cache: new Map<string, any>(),
  loaders: new Map<number, any>(),
  LOD_DISTANCES: DEFAULT_LOD_DISTANCES,
  processModelAsset,
  handleLODs,
  getAssetType,
  getAssetClass,
  getLoader,
  assetLoadCallback,
  load,
  loadAsync,
  getFromCache
}

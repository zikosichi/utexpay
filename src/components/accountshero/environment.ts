import type * as THREE from 'three'
import { createPhotoEnvironment as homeEnvironment } from '../photostructure/environment'
import { DEFAULT_OPTIONS as HOME_OPTIONS } from '../photostructure/config'
import type { PhotoOptions } from './config'

/** Keep the home-page lighting, backdrop and physical reflection unchanged. */
export function createPhotoEnvironment(projector: THREE.OrthographicCamera) {
  const environment = homeEnvironment(projector)
  return {
    ...environment,
    update(options: PhotoOptions) { environment.update({ ...HOME_OPTIONS, ...options }) },
  }
}

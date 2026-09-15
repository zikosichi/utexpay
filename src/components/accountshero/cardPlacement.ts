import * as THREE from 'three'
import { CARD_YAW_LIMIT, DEFAULT_OPTIONS } from './config.ts'
import { taperCardPoint } from './cardPerspective.ts'

/** A level lower edge on the photographed shelf, with the upper edge leaning back. */
export function seatAccountCard(card: THREE.Object3D, body: THREE.Mesh, shelf: THREE.Plane, blocks: THREE.Mesh[], yaw = DEFAULT_OPTIONS.cardYaw, perspective = DEFAULT_OPTIONS.cardPerspective) {
  card.scale.setScalar(1.08)
  // Keep the lower edge parallel to the shelf; only the top leans backward.
  const angle = THREE.MathUtils.clamp(Number.isFinite(yaw) ? yaw : DEFAULT_OPTIONS.cardYaw, -CARD_YAW_LIMIT, CARD_YAW_LIMIT)
  card.rotation.set(-.08, THREE.MathUtils.degToRad(angle), 0, 'YXZ')
  card.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),shelf.normal))
  card.position.set(2.28,0,0)
  card.updateMatrixWorld(true)
  blocks.forEach((block) => block.updateMatrixWorld(true))
  const wallFront = Math.max(...blocks.filter((block) => block.geometry.name !== 'Foundation').map((block) => new THREE.Box3().setFromObject(block).max.z))
  const positions = body.geometry.getAttribute('position'), vertex = new THREE.Vector3()
  let minimum = Infinity, rear = Infinity
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions,i).applyMatrix4(body.matrixWorld)
    minimum = Math.min(minimum,shelf.distanceToPoint(vertex)); rear = Math.min(rear,vertex.z)
  }
  card.position.z += wallFront + .03 - rear
  card.position.addScaledVector(shelf.normal,.003-minimum)
  card.updateMatrixWorld(true)
  // Both sides of the rounded core contribute to its projected silhouette.
  const outline: THREE.Vector3[] = []
  for (const z of [-.0135,.0135]) for (let corner = 0; corner < 4; corner++) {
    const centers = [[.703,1.163],[-.703,1.163],[-.703,-1.163],[.703,-1.163]]
    for (let i = 0; i <= 6; i++) {
      const angle = (corner+i/6)*Math.PI/2
      outline.push(taperCardPoint(new THREE.Vector3(centers[corner][0]+.087*Math.cos(angle),centers[corner][1]+.087*Math.sin(angle),z),perspective).applyMatrix4(body.matrixWorld))
    }
  }
  return outline
}

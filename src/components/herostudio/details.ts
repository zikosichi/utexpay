import * as THREE from 'three'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  return { c, ctx: c.getContext('2d')! }
}
function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = '#b7b3ab', font = 'DM Sans') {
  ctx.font = `400 ${size}px "${font}", sans-serif`; ctx.fillStyle = color; ctx.fillText(s, x, y)
}
function rule(ctx: CanvasRenderingContext2D, y: number, w = 760) {
  ctx.strokeStyle = '#39362f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(62, y); ctx.lineTo(w - 62, y); ctx.stroke()
}

function screenTexture(index: number) {
  const heights = [490, 610, 740], w = 760, h = heights[index]
  const { c, ctx } = canvas(w, h)
  const bg = ctx.createLinearGradient(0, 0, w * .75, h)
  bg.addColorStop(0, '#24231f'); bg.addColorStop(.48, '#171714'); bg.addColorStop(1, '#10110f')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
  // Fine deterministic surface grain, kept below the type's contrast.
  let seed = 1824
  for (let i = 0; i < 19000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed % w
    seed = (seed * 1664525 + 1013904223) >>> 0; const y = seed % h
    ctx.fillStyle = i % 2 ? 'rgba(240,225,201,.018)' : 'rgba(0,0,0,.025)'; ctx.fillRect(x, y, 1, 1)
  }
  if (index === 0) {
    ctx.letterSpacing = '3px'; text(ctx, 'TOTAL BALANCE', 62, 70, 25, '#969182', 'IBM Plex Mono'); ctx.letterSpacing = '0px'
    text(ctx, '€ 28,142.55', 60, 151, 61, '#e1ded6'); rule(ctx, 192)
    const rows = [['€', 'EUR', '€18,432.55', '#25477c'], ['$', 'USD', '$5,820.40', '#56515a'], ['£', 'GBP', '£3,540.00', '#725254']]
    rows.forEach(([symbol, name, value, color], i) => {
      const y = 257 + i * 84
      const grd = ctx.createLinearGradient(70, y - 27, 100, y + 24); grd.addColorStop(0, color); grd.addColorStop(1, '#282928')
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(87, y - 9, 28, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#817a6759'; ctx.stroke()
      text(ctx, symbol, 76, y + 2, 29, '#e4e1d9'); text(ctx, name, 138, y + 1, 34, '#c8c5bd')
      ctx.textAlign = 'right'; text(ctx, value, 635, y + 1, 35, '#dbd8d0'); text(ctx, '›', 694, y + 1, 37); ctx.textAlign = 'left'
      if (i < 2) rule(ctx, y + 35)
    })
  } else if (index === 1) {
    ctx.letterSpacing = '3px'; text(ctx, 'TEAM & APPROVALS', 62, 91, 26, '#b0a797', 'IBM Plex Mono'); ctx.letterSpacing = '0px'; rule(ctx, 128)
    text(ctx, 'Team members', 62, 203, 34, '#cfcbc3'); text(ctx, '7', 667, 203, 36)
    const colors = ['#706653', '#45423c', '#655e50', '#464239', '#9d8a62']
    colors.forEach((color, i) => {
      ctx.beginPath(); ctx.arc(94 + i * 63, 278, 37, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#ab9a7466'; ctx.lineWidth = 2; ctx.stroke()
    })
    ctx.beginPath(); ctx.arc(463, 278, 34, 0, Math.PI * 2); ctx.fillStyle = '#2c2b26'; ctx.fill(); text(ctx, '+2', 442, 288, 29)
    rule(ctx, 364); text(ctx, 'Pending approvals', 62, 441, 34, '#a9a59c'); text(ctx, '2', 667, 441, 36)
    text(ctx, '€4,250.00', 62, 517, 45, '#c3994c'); rule(ctx, 565)
  } else {
    ctx.beginPath(); ctx.arc(94, 115, 34, 0, Math.PI * 2); ctx.fillStyle = '#74a963'; ctx.fill()
    ctx.strokeStyle = '#173223'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(79, 113); ctx.lineTo(90, 125); ctx.lineTo(112, 99); ctx.stroke()
    text(ctx, 'Card payment received', 151, 127, 33, '#d8d5ce')
    text(ctx, '€125.00 from', 151, 234, 36, '#d0cdc5'); text(ctx, 'Acme Cycling Ltd', 151, 289, 36, '#d0cdc5'); rule(ctx, 345)
    text(ctx, 'Processing volume', 62, 425, 34, '#b2afa6'); text(ctx, 'This month', 62, 480, 32, '#7d7b72')
    const bars = [13, 24, 41, 60, 80, 105, 128, 154, 185]
    bars.forEach((height, i) => {
      const x = 318 + i * 39, y = 644 - height * .78
      const g = ctx.createLinearGradient(x, y, x + 25, y); g.addColorStop(0, '#826139'); g.addColorStop(.65, '#b28c50'); g.addColorStop(1, '#735b36')
      ctx.fillStyle = g; ctx.fillRect(x, y, 25, height * .78); ctx.fillStyle = '#ddbd784f'; ctx.fillRect(x, y, 25, 2)
    })
    rule(ctx, 647); rule(ctx, 699)
  }
  return texture(c)
}

export function display(index: number, width: number, height: number) {
  const group = new THREE.Group()
  const casing = new THREE.Mesh(roundSolid(width + .13, height + .13, .08, .15), new THREE.MeshBasicMaterial({ color: '#070806' }))
  group.add(casing)
  const rim = new THREE.Mesh(roundSolid(width + .025, height + .025, .022, .12), new THREE.MeshStandardMaterial({ color: '#95805b', metalness: .9, roughness: .32, envMapIntensity: .28 }))
  rim.position.z = .04; group.add(rim)
  const face = new THREE.Mesh(roundPlane(width - .03, height - .03, .095), new THREE.MeshBasicMaterial({ map: screenTexture(index) }))
  face.position.z = .054; group.add(face)
  // Small reflection that stays in the display glass as the camera changes.
  const glass = new THREE.Mesh(roundPlane(width - .035, height - .035, .095), new THREE.MeshPhysicalMaterial({ color: '#dcd3c0', transparent: true, opacity: .065, metalness: .75, roughness: .21, clearcoat: .4, clearcoatRoughness: .18, envMapIntensity: .45, depthWrite: false }))
  glass.position.z = .056; group.add(glass)
  return group
}

export function label(name: string, width: number) {
  const { c, ctx } = canvas(1024, 128)
  ctx.textAlign = 'center'; ctx.letterSpacing = '13px'
  text(ctx, name, 512, 82, 76, '#c9ab76', 'IBM Plex Mono')
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8), new THREE.MeshBasicMaterial({ map: texture(c), transparent: true, depthWrite: false }))
  return mesh
}

function roundedRect(w: number, h: number, r: number) {
  const shape = new THREE.Shape(), x = -w / 2, y = -h / 2
  shape.moveTo(x + r, y); shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

export function roundSolid(w: number, h: number, d: number, r: number) {
  const bevel = Math.min(.004, d * .2)
  const g = new THREE.ExtrudeGeometry(roundedRect(w, h, r), { depth: d - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 16 })
  g.translate(0, 0, -d / 2 + bevel)
  return g
}

/** One watertight card: front, back and chamfer share the same solid mesh. */
export function cardSolid(w: number, h: number, d: number, r: number) {
  const g = roundSolid(w, h, d, r)
  const position = g.getAttribute('position'), normal = g.getAttribute('normal'), uv = g.getAttribute('uv')
  g.clearGroups()
  let start = 0, previous = -1
  for (let i = 0; i < position.count; i += 3) {
    const nz = normal.getZ(i)
    const material = nz > .9999 ? 0 : nz < -.9999 ? 1 : 2
    if (material !== previous) {
      if (i > start) g.addGroup(start, i - start, previous)
      start = i; previous = material
    }
    for (let j = i; j < i + 3; j++) uv.setXY(j, position.getX(j) / w + .5, position.getY(j) / h + .5)
  }
  g.addGroup(start, position.count - start, previous)
  return g
}

/** The studio assembly has untransformed parents. Use actual vertices because
 * transforming an axis-aligned box can leave a rounded, tilted card floating. */
export function seatOnPedestal(object: THREE.Object3D, wallFront?: number) {
  object.updateWorldMatrix(true, true)
  const bounds = new THREE.Box3().setFromObject(object, true)
  object.position.y += .002 - bounds.min.y
  if (wallFront !== undefined) object.position.z += Math.max(0, wallFront + .09 - bounds.min.z)
  object.updateWorldMatrix(true, true)
}

export function roundPlane(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 16), p = g.getAttribute('position'), uv = g.getAttribute('uv')
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5)
  return g
}

import * as THREE from 'three'
import { surfaceMatrix } from '../photostructure/surfaces'
import type { Quad } from '../photostructure/surfaces'
import { PANEL_SURFACES } from './surfaces'
import type { PanelName } from './surfaces'
import type { PhotoFocus } from './config'
import { prepareDecalTexture } from '../photostructure/decals'
import { silhouette, panelOcclusion, panelShadow, castOutline } from './occlusion'

type Surface = { name: PanelName; geometry: THREE.BufferGeometry }

/** Cheap, state-driven reflection of the live DOM; never used for the front UI. */
function paintReflection(element: HTMLElement, canvas: HTMLCanvasElement, unit: number) {
  const root = element.querySelector<HTMLElement>('.ah-panel')
  const ctx = canvas.getContext('2d')
  if (!root || !ctx || !unit) return
  ctx.clearRect(0,0,canvas.width,canvas.height)
  ctx.save(); ctx.scale(1/unit,1/unit)
  const position = (node: HTMLElement) => {
    let x = 0, y = 0, current: HTMLElement | null = node
    while (current && current !== root) { x += current.offsetLeft; y += current.offsetTop; current = current.offsetParent as HTMLElement | null }
    return { x, y, width: node.offsetWidth, height: node.offsetHeight }
  }
  const rounded = (x: number, y: number, w: number, h: number, radius: number) => {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,Math.min(radius,w/2,h/2))
  }
  const glass = root.querySelector<HTMLElement>('.ah-glass')!
  const box = position(glass)
  ctx.fillStyle = '#171710bf'; rounded(box.x,box.y,box.width,box.height,16*unit); ctx.fill()
  ctx.strokeStyle = '#a18c6875'; ctx.lineWidth = 1.5*unit; ctx.stroke()
  for (const node of root.querySelectorAll<HTMLElement>('*')) {
    if (!(node instanceof HTMLElement) || node.tagName === 'OPTION') continue
    if (node.closest('[data-reflect-skip]')) continue
    const owner = node.closest<HTMLElement>('[data-reflect-text]')
    if (owner && owner !== node) continue
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    const {x,y,width,height} = position(node)
    if (!width || !height) continue
    if (node.classList.contains('ah-coin') || node.classList.contains('ah-arrow') || node.tagName === 'I') {
      ctx.fillStyle = node.classList.contains('eur') ? '#24528a' : node.classList.contains('usd') ? '#5a5355' : node.classList.contains('gbp') ? '#784e52' : node.classList.contains('outgoing') ? '#714837' : '#57824c'
      rounded(x,y,width,height,Math.min(width,height)/2); ctx.fill()
    }
    if (parseFloat(style.borderTopWidth) > 0 && !node.classList.contains('ah-glass')) {
      ctx.strokeStyle = style.borderTopColor; ctx.lineWidth = parseFloat(style.borderTopWidth)
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+width,y); ctx.stroke()
    }
    const raw = node.dataset.reflectText ?? (node instanceof HTMLSelectElement ? node.selectedOptions[0]?.textContent : node.childElementCount === 0 ? node.textContent : '')
    if (!raw?.trim()) continue
    const text = style.textTransform === 'uppercase' ? raw.trim().toUpperCase() : raw.trim()
    const size = parseFloat(style.fontSize), line = parseFloat(style.lineHeight) || size*1.35
    ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`
    ctx.fillStyle = style.color; ctx.textBaseline = 'alphabetic'
    ctx.textAlign = style.textAlign === 'right' ? 'right' : node.classList.contains('ah-coin') || node.classList.contains('ah-arrow') ? 'center' : 'left'
    const tx = ctx.textAlign === 'right' ? x+width : ctx.textAlign === 'center' ? x+width/2 : x
    const ty = y + (node.classList.contains('ah-coin') || node.classList.contains('ah-arrow') ? (height-line)/2 : 0) + (line-size)/2 + size*.8
    ctx.fillText(text,tx,ty)
  }
  // The icons use only local SVG paths, circles and rectangles.
  for (const svg of root.querySelectorAll('svg')) {
    const parent = svg.parentElement
    if (!(parent instanceof HTMLElement)) continue
    const box = position(parent), style = getComputedStyle(svg), view = svg.viewBox.baseVal
    const width = parseFloat(style.width), height = parseFloat(style.height)
    if (!view.width || !view.height) continue
    ctx.save(); ctx.translate(box.x+(box.width-width)/2,box.y+(box.height-height)/2); ctx.scale(width/view.width,height/view.height); ctx.translate(-view.x,-view.y)
    for (const shape of svg.children) {
      const fill = shape.getAttribute('fill') ?? svg.getAttribute('fill') ?? 'none'
      const stroke = shape.getAttribute('stroke') ?? svg.getAttribute('stroke') ?? 'none'
      ctx.fillStyle = fill === 'currentColor' ? style.color : fill
      ctx.strokeStyle = stroke === 'currentColor' ? style.color : stroke
      ctx.lineWidth = Number(shape.getAttribute('stroke-width') ?? svg.getAttribute('stroke-width') ?? 1)
      const n = (key: string) => Number(shape.getAttribute(key) ?? 0)
      let path = new Path2D()
      if (shape.tagName === 'path') path = new Path2D(shape.getAttribute('d') ?? '')
      else if (shape.tagName === 'rect') path.roundRect(n('x'),n('y'),n('width'),n('height'),n('rx'))
      else if (shape.tagName === 'circle') path.arc(n('cx'),n('cy'),n('r'),0,Math.PI*2)
      if (fill !== 'none') ctx.fill(path)
      if (stroke !== 'none') ctx.stroke(path)
    }
    ctx.restore()
  }
  ctx.restore()
}

export function createLivePanels(root: HTMLElement, surfaces: Surface[], maxAnisotropy: number, invalidate: () => void) {
  let width = 1, height = 1, unit = 1, captureFrame = 0, disposed = false
  const panels = surfaces.filter(({ name }) => !name.endsWith('-title')).map(({ name, geometry }) => {
    const element = root.querySelector<HTMLElement>(`[data-live-panel="${name}"]`)!
    const shadow = element.querySelector<HTMLElement>('.ah-card-shadow')!
    const spec = PANEL_SURFACES[name]
    const canvas = document.createElement('canvas'); canvas.width = spec.width; canvas.height = spec.height
    const texture = prepareDecalTexture(new THREE.CanvasTexture(canvas),maxAnisotropy)
    return { name, element, shadow, spec, canvas, texture, corners: (geometry.userData.corners as number[][]).map((point) => new THREE.Vector3(...point)), quad: [[0,0],[0,0],[0,0],[0,0]] as Quad }
  })
  const refresh = () => {
    if (disposed || captureFrame) return
    captureFrame = requestAnimationFrame(() => {
      captureFrame = 0
      for (const panel of panels) { paintReflection(panel.element,panel.canvas,unit); panel.texture.needsUpdate = true }
      invalidate()
    })
  }
  const observer = new MutationObserver(refresh)
  observer.observe(root,{ subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-pressed','value','data-reflect-skip'] })
  // Select.value is a property; change events cover it without observing camera styles.
  root.addEventListener('change',refresh)
  void document.fonts.ready.then(refresh)
  const point = new THREE.Vector3()
  return {
    textures: new Map(panels.map((panel) => [panel.name,panel.texture])),
    resize(canvasWidth: number, canvasHeight: number, stageWidth: number, worldWidth: number, clip: { top: number; left: number; right: number }) {
      width = canvasWidth; height = canvasHeight
      unit = 4*stageWidth/worldWidth/720
      root.style.clipPath = `inset(${Math.max(0,clip.top)}px ${Math.max(0,clip.right)}px 0 ${Math.max(0,clip.left)}px)`
      for (const panel of panels) {
        panel.element.style.width = `${panel.spec.width*unit}px`; panel.element.style.height = `${panel.spec.height*unit}px`
        panel.element.style.setProperty('--ah-unit',`${unit}px`)
        // The shadow layer lives inside the glass; give it the panel's own box.
        const glass = panel.element.querySelector<HTMLElement>('.ah-glass')!
        panel.shadow.style.left = `${-(glass.offsetLeft+glass.clientLeft)}px`; panel.shadow.style.top = `${-(glass.offsetTop+glass.clientTop)}px`
        panel.shadow.style.width = `${panel.spec.width*unit}px`; panel.shadow.style.height = `${panel.spec.height*unit}px`
      }
      refresh()
    },
    update(camera: THREE.Camera, visible: boolean, focus: PhotoFocus, interactive: boolean, occluder: THREE.Vector3[], light: THREE.Vector3) {
      root.style.visibility = visible ? 'visible' : 'hidden'
      root.inert = !visible || !interactive
      if (!visible) return
      const outline = silhouette(occluder.map((vertex): [number,number] => {
        point.copy(vertex).project(camera)
        return [(point.x+1)*width/2,(1-point.y)*height/2]
      }))
      for (const panel of panels) {
        const shadow = silhouette(castOutline(occluder,light,panel.corners).map((vertex): [number,number] => {
          point.copy(vertex).project(camera)
          return [(point.x+1)*width/2,(1-point.y)*height/2]
        }))
        panel.corners.forEach((corner,index) => {
          point.copy(corner).project(camera)
          panel.quad[index][0] = (point.x+1)*width/2; panel.quad[index][1] = (1-point.y)*height/2
        })
        const matrix = surfaceMatrix(panel.quad,panel.spec.width*unit,panel.spec.height*unit)
        if (matrix) {
          panel.element.style.transform = `matrix3d(${matrix.map((value) => +value.toFixed(9)).join(',')})`
          panel.element.style.clipPath = panelOcclusion(matrix,outline,panel.spec.width*unit,panel.spec.height*unit)
          panel.shadow.style.clipPath = shadow.length > 2 ? panelShadow(matrix,shadow,panel.spec.width*unit,panel.spec.height*unit) : 'polygon(0 0, 0 0, 0 0)'
        }
        panel.element.inert = focus !== 'full' && focus !== panel.name
      }
    },
    dispose() {
      disposed = true; cancelAnimationFrame(captureFrame); observer.disconnect(); root.removeEventListener('change',refresh)
      root.style.visibility = 'hidden'; root.inert = true
      panels.forEach((panel) => { panel.texture.dispose(); panel.element.style.clipPath = '' })
    },
  }
}

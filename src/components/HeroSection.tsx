import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import {
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'

type HeroSectionProps = {
  eyebrow?: string
  headline?: string
  description?: string
  primaryCtaLabel?: string
  secondaryCtaLabel?: string
  accent?: 'gold' | 'lime'
  depth?: 'flat' | 'layered' | 'dramatic'
  motionMode?: 'off' | 'subtle' | 'expressive'
  floatIntensity?: number
  showProductNetwork?: boolean
  showTrustRow?: boolean
}

type ProductCardProps = {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
  delay?: number
  motionEnabled: boolean
  floatIntensity: number
}

const palette = {
  gold: {
    accent: '#e5ad3e',
    bright: '#ffd779',
    glow: 'rgba(229,173,62,0.28)',
    soft: 'rgba(229,173,62,0.11)',
  },
  lime: {
    accent: '#b9f45c',
    bright: '#dcff9f',
    glow: 'rgba(185,244,92,0.25)',
    soft: 'rgba(185,244,92,0.1)',
  },
}

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2">
    <path d="M4 10h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 18 18" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
    <path d="m4 9.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const BankIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
    <path d="m3 9 9-5 9 5M5 10h14M6 10v7m4-7v7m4-7v7m4-7v7M4 18h16M3 21h18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CardIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3 10h18M7 15h3" strokeLinecap="round" />
  </svg>
)

const TransferIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
    <path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TerminalIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M7 10h3m-3 4h1m4 0h5" strokeLinecap="round" />
  </svg>
)

function Brand() {
  return (
    <span className="flex items-center gap-2.5" aria-label="UTEX Pay">
      <span className="text-[19px] font-semibold tracking-[-0.05em] text-white">UTEX</span>
      <span className="rounded-[5px] bg-[#f2ead7] px-2 py-0.5 text-[12px] font-bold tracking-[0.02em] text-[#0b0b09]">PAY</span>
    </span>
  )
}

function ProductCard({
  title,
  icon,
  children,
  className = '',
  delay = 0,
  motionEnabled,
  floatIntensity,
}: ProductCardProps) {
  return (
    <motion.article
      initial={motionEnabled ? { opacity: 0, y: 22, scale: 0.97 } : false}
      animate={{
        opacity: 1,
        y: motionEnabled ? [0, -Math.max(2, floatIntensity * (0.2 + delay * 0.06)), 0] : 0,
        scale: 1,
      }}
      transition={{
        opacity: { duration: 0.45, delay },
        scale: { type: 'spring', duration: 0.8, bounce: 0.14, delay },
        y: { duration: 4.8 + delay, delay: 0.9 + delay, repeat: Infinity, ease: 'easeInOut' },
      }}
      whileHover={motionEnabled ? { y: -7, rotateX: 2, rotateY: -2, transition: { duration: 0.24 } } : undefined}
      className={`group relative overflow-hidden rounded-[18px] border border-[color:var(--accent-border)] bg-[linear-gradient(145deg,rgba(32,31,27,0.96),rgba(13,13,12,0.98))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.38),inset_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl [transform-style:preserve-3d] ${className}`}
      style={{
        '--float': `${floatIntensity}px`,
        transformPerspective: 900,
      } as CSSProperties}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3 text-[color:var(--accent)]">
        {icon}
        <h3 className="text-[13px] font-medium text-white/90">{title}</h3>
      </div>
      {children}
      <div className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.035)_48%,transparent_66%)]" />
    </motion.article>
  )
}

function PersonalBankingCard(props: Pick<ProductCardProps, 'motionEnabled' | 'floatIntensity' | 'delay' | 'className'>) {
  return (
    <ProductCard title="Personal banking" icon={<BankIcon />} {...props}>
      <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-white/38">Total balance</p>
            <p className="mt-1 text-[21px] font-medium tracking-[-0.035em] text-white">€12,432.20</p>
            <p className="mt-1 text-[10px] text-white/40">Across 3 accounts</p>
          </div>
          <div className="flex -space-x-1.5 pt-0.5">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[#163765] text-[10px] text-white">€</span>
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[#58494a] text-[10px] text-white">$</span>
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[#6d4b4e] text-[10px] text-white">£</span>
          </div>
        </div>
        <svg aria-label="Balance trend" viewBox="0 0 190 38" className="mt-2 h-9 w-full overflow-visible fill-none">
          <motion.path
            d="M2 30 C20 23 28 35 44 22 S70 15 82 20 S104 7 120 14 S146 24 160 11 S180 4 188 5"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={props.motionEnabled ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.9 }}
          />
        </svg>
      </div>
    </ProductCard>
  )
}

function BusinessBankingCard(props: Pick<ProductCardProps, 'motionEnabled' | 'floatIntensity' | 'delay' | 'className'>) {
  return (
    <ProductCard title="Business banking" icon={<BankIcon />} {...props}>
      <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
        <p className="text-[10px] text-white/38">Team</p>
        <div className="mt-2 flex -space-x-1.5">
          {['JS', 'AL', 'MW', '+3'].map((member, index) => (
            <span key={member} className="grid h-7 w-7 place-items-center rounded-full border border-[#24231f] text-[9px] text-white" style={{ backgroundColor: ['#76736b', '#735d5c', '#4c5368', '#33332f'][index] }}>{member}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div>
            <p className="text-[10px] text-white/38">Pending approvals</p>
            <p className="mt-1 text-xs font-medium text-white">2 payments</p>
          </div>
          <span className="text-lg text-white/35">›</span>
        </div>
      </div>
    </ProductCard>
  )
}

function CardsCard(props: Pick<ProductCardProps, 'motionEnabled' | 'floatIntensity' | 'delay' | 'className'>) {
  return (
    <ProductCard title="Cards" icon={<CardIcon />} {...props}>
      <div className="mt-3 rounded-xl border border-white/[0.07] bg-[linear-gradient(130deg,#29251d,#1b1a17)] p-3 shadow-inner">
        <div className="flex items-center justify-between text-[11px]">
          <span className="tracking-[0.14em] text-white/48">•••• 4628</span>
          <span className="font-bold text-[color:var(--accent)]">UTEX</span>
        </div>
        <div className="mt-5 flex items-end justify-between text-[9px] text-white/40">
          <span>VISA</span><span className="text-xs font-bold italic text-white/60">VISA</span>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[10px] text-white/38">Available to spend</p>
        <p className="mt-1 text-[12px] text-white">€8,750.00 <span className="text-white/35">/ €10,000.00</span></p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><motion.div initial={props.motionEnabled ? { scaleX: 0 } : false} animate={{ scaleX: 0.87 }} transition={{ duration: 1, delay: 1.1 }} className="h-full origin-left rounded-full bg-[color:var(--accent)]" /></div>
      </div>
    </ProductCard>
  )
}

function ProcessingCard(props: Pick<ProductCardProps, 'motionEnabled' | 'floatIntensity' | 'delay' | 'className'>) {
  const bars = [28, 58, 40, 72, 48, 76, 38, 66, 84, 54, 96]
  return (
    <ProductCard title="Processing" icon={<TerminalIcon />} {...props}>
      <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
        <p className="text-[10px] text-white/38">Volume (30 days)</p>
        <p className="mt-1 text-xl font-medium tracking-[-0.03em] text-white">€86,420.50</p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/[0.06] pt-3">
          <div><p className="text-[10px] text-white/38">Success rate</p><p className="mt-1 text-lg font-medium text-[#76cf64]">99.2%</p></div>
          <div className="flex h-9 items-end gap-1">
            {bars.map((height, index) => (
              <motion.span key={index} className="w-1.5 rounded-t-[2px] bg-[#83b84a]" style={{ height: `${height}%`, originY: 1 }} initial={props.motionEnabled ? { scaleY: 0.2 } : false} animate={props.motionEnabled ? { scaleY: [0.35, 1, 0.62, 1] } : { scaleY: 1 }} transition={{ duration: 1.8, delay: index * 0.05, repeat: Infinity, repeatDelay: 1.4 }} />
            ))}
          </div>
        </div>
      </div>
    </ProductCard>
  )
}

function PaymentCard(props: Pick<ProductCardProps, 'motionEnabled' | 'floatIntensity' | 'delay' | 'className'>) {
  return (
    <ProductCard title="Card payments" icon={<CardIcon />} {...props}>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#65c66f] text-white"><CardIcon /></span>
        <div className="min-w-0">
          <p className="text-[10px] text-white/38">Latest payment</p>
          <p className="mt-1 text-[18px] font-medium text-[#70d77d]">+€1,250.00</p>
          <p className="mt-2 truncate text-[10px] text-white/38">From Sam Gold · 12:43</p>
        </div>
      </div>
    </ProductCard>
  )
}

function TransfersCard(props: Pick<ProductCardProps, 'motionEnabled' | 'floatIntensity' | 'delay' | 'className'>) {
  return (
    <ProductCard title="Transfers" icon={<TransferIcon />} {...props}>
      <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
        <p className="text-[12px] font-medium text-white">EUR <span className="text-[color:var(--accent)]">→</span> USD</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#173562] text-xs text-white">€</span><div><p className="text-[9px] text-white/38">You send</p><p className="text-xs text-white">€2,500.00</p></div></div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#62464b] text-xs text-white">$</span>
        </div>
        <div className="mt-3 border-t border-white/[0.06] pt-2"><p className="text-[9px] text-white/38">They receive</p><p className="mt-0.5 text-sm text-white">$2,702.50</p></div>
      </div>
    </ProductCard>
  )
}

function MetalCard({ motionEnabled, depthAmount, floatIntensity }: { motionEnabled: boolean; depthAmount: number; floatIntensity: number }) {
  return (
    <motion.div
      animate={motionEnabled ? { y: [-floatIntensity * 0.35, floatIntensity * 0.35, -floatIntensity * 0.35], rotateZ: [-0.4, 0.4, -0.4] } : undefined}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute left-1/2 top-0 h-[178px] w-[285px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[color:var(--accent-border)] bg-[linear-gradient(125deg,#806735_0%,#b59655_38%,#ead28d_62%,#6f592c_100%)] p-5 shadow-[0_20px_70px_var(--accent-glow)]"
      style={{ transform: `translateX(-50%) translateZ(${depthAmount * 0.35}px)` }}
    >
      <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_22%),repeating-linear-gradient(45deg,transparent_0_7px,rgba(255,255,255,0.08)_8px_9px)]" />
      <div className="relative flex items-start justify-between">
        <span className="grid h-10 w-12 place-items-center rounded-lg border border-black/15 bg-[#dcc17f]/60">
          <span className="h-6 w-8 rounded-md border border-black/20 [background:linear-gradient(90deg,transparent_47%,rgba(0,0,0,0.2)_48%_52%,transparent_53%)]" />
        </span>
        <span className="text-sm font-semibold tracking-[-0.04em] text-[#f7e8bc]">UTEX <span className="rounded bg-[#f5e3b6] px-1 py-0.5 text-[9px] text-[#705c2d]">PAY</span></span>
      </div>
    </motion.div>
  )
}

function MainAccountCard({ depthAmount }: { depthAmount: number }) {
  return (
    <div className="absolute left-1/2 top-[92px] w-[360px] max-w-[92vw] -translate-x-1/2 rounded-[20px] border border-[color:var(--accent-border)] bg-[linear-gradient(145deg,#25231d,#11110f_72%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.62),0_0_50px_var(--accent-glow)]" style={{ transform: `translateX(-50%) translateZ(${depthAmount}px)` }}>
      <div className="flex items-center gap-2 text-[color:var(--accent)]"><BankIcon /><span className="text-[13px] text-white/80">Main account</span></div>
      <div className="mt-4 flex items-center gap-3"><p className="text-[36px] font-light tracking-[-0.045em] text-white">€28,142.55</p><span className="text-white/25">◉</span></div>
      <p className="mt-1 text-[11px] text-white/38">All accounts</p>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-[10px] text-white/35"><span>Updated just now</span><span className="text-[color:var(--accent)]">+12.4% this month</span></div>
    </div>
  )
}

function ConnectorNetwork({ motionEnabled }: { motionEnabled: boolean }) {
  const paths = [
    'M234 154 H294 Q314 154 314 174 V204 Q314 222 334 222 H380',
    'M886 154 H826 Q806 154 806 174 V204 Q806 222 786 222 H740',
    'M234 370 H294 Q314 370 314 350 V306 Q314 286 334 286 H380',
    'M886 370 H826 Q806 370 806 350 V306 Q806 286 786 286 H740',
    'M492 316 V374 Q492 392 472 392 H408 Q388 392 388 412 V428',
    'M628 316 V374 Q628 392 648 392 H712 Q732 392 732 412 V428',
  ]
  return (
    <svg aria-hidden="true" viewBox="0 0 1120 550" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible fill-none">
      <defs><filter id="connector-glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      {paths.map((path, index) => (
        <g key={path}>
          <path d={path} stroke="rgba(229,173,62,0.1)" strokeWidth="6" filter="url(#connector-glow)" />
          <motion.path d={path} stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" initial={motionEnabled ? { pathLength: 0, opacity: 0 } : false} animate={{ pathLength: 1, opacity: 0.7 }} transition={{ duration: 1.1, delay: 0.55 + index * 0.09 }} />
        </g>
      ))}
      {[[234,154],[380,222],[886,154],[740,222],[234,370],[380,286],[886,370],[740,286],[388,428],[732,428]].map(([cx, cy], index) => (
        <motion.circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" fill="var(--accent)" filter="url(#connector-glow)" animate={motionEnabled ? { r: [3.5, 6, 3.5], opacity: [0.55, 1, 0.55] } : undefined} transition={{ duration: 2, delay: index * 0.12, repeat: Infinity }} />
      ))}
    </svg>
  )
}

function DesktopProductNetwork({ motionEnabled, floatIntensity, depthAmount, rotateX, rotateY }: { motionEnabled: boolean; floatIntensity: number; depthAmount: number; rotateX: MotionValue<number>; rotateY: MotionValue<number> }) {
  return (
    <div className="relative mx-auto hidden h-[550px] w-full max-w-[1120px] lg:block [perspective:1200px]">
      <ConnectorNetwork motionEnabled={motionEnabled} />
      <PersonalBankingCard className="absolute left-0 top-[66px] w-[234px]" delay={0.62} motionEnabled={motionEnabled} floatIntensity={floatIntensity} />
      <BusinessBankingCard className="absolute right-0 top-[66px] w-[234px]" delay={0.72} motionEnabled={motionEnabled} floatIntensity={floatIntensity} />
      <CardsCard className="absolute left-0 top-[282px] w-[234px]" delay={0.82} motionEnabled={motionEnabled} floatIntensity={floatIntensity} />
      <ProcessingCard className="absolute right-0 top-[282px] w-[234px]" delay={0.92} motionEnabled={motionEnabled} floatIntensity={floatIntensity} />
      <PaymentCard className="absolute bottom-0 left-[268px] w-[240px]" delay={1.02} motionEnabled={motionEnabled} floatIntensity={floatIntensity} />
      <TransfersCard className="absolute bottom-0 right-[268px] w-[240px]" delay={1.12} motionEnabled={motionEnabled} floatIntensity={floatIntensity} />

      <motion.div className="absolute left-1/2 top-[40px] h-[330px] w-[440px] -translate-x-1/2 [transform-style:preserve-3d]" style={{ rotateX, rotateY, transformPerspective: 1200 }}>
        <div className="absolute left-1/2 top-[95px] h-40 w-96 -translate-x-1/2 rounded-full bg-[color:var(--accent-glow)] blur-[70px]" />
        <MetalCard motionEnabled={motionEnabled} depthAmount={depthAmount} floatIntensity={floatIntensity} />
        <MainAccountCard depthAmount={depthAmount} />
      </motion.div>
    </div>
  )
}

function MobileProductNetwork({ motionEnabled, floatIntensity, depthAmount }: { motionEnabled: boolean; floatIntensity: number; depthAmount: number }) {
  return (
    <div className="mx-auto w-full max-w-2xl lg:hidden">
      <div className="relative mx-auto h-[290px] w-full max-w-[390px] [perspective:1000px]">
        <div className="absolute left-1/2 top-20 h-32 w-72 -translate-x-1/2 rounded-full bg-[color:var(--accent-glow)] blur-[60px]" />
        <MetalCard motionEnabled={motionEnabled} depthAmount={depthAmount} floatIntensity={floatIntensity} />
        <MainAccountCard depthAmount={depthAmount} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PersonalBankingCard motionEnabled={motionEnabled} floatIntensity={floatIntensity} delay={0.3} />
        <BusinessBankingCard motionEnabled={motionEnabled} floatIntensity={floatIntensity} delay={0.4} />
        <CardsCard motionEnabled={motionEnabled} floatIntensity={floatIntensity} delay={0.5} />
        <ProcessingCard motionEnabled={motionEnabled} floatIntensity={floatIntensity} delay={0.6} />
        <PaymentCard motionEnabled={motionEnabled} floatIntensity={floatIntensity} delay={0.7} />
        <TransfersCard motionEnabled={motionEnabled} floatIntensity={floatIntensity} delay={0.8} />
      </div>
    </div>
  )
}

export function HeroSection({
  eyebrow = 'From your first account to your whole business',
  headline = 'The bank that grows with you.',
  description = 'Start with banking. Add cards, transfers, and payment acceptance when you’re ready — all in one place.',
  primaryCtaLabel = 'Sign up',
  secondaryCtaLabel = 'Talk to sales',
  accent = 'gold',
  depth = 'dramatic',
  motionMode = 'expressive',
  floatIntensity = 12,
  showProductNetwork = true,
  showTrustRow = true,
}: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion()
  const motionEnabled = motionMode !== 'off' && !prefersReducedMotion
  const amplitude = motionMode === 'subtle' ? floatIntensity * 0.45 : floatIntensity
  const depthAmount = depth === 'flat' ? 0 : depth === 'layered' ? 24 : 48
  const colors = palette[accent]

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 20, mass: 0.6 })
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 20, mass: 0.6 })
  const rotateX = useTransform(smoothY, [-1, 1], [depth === 'flat' ? 0 : 5, depth === 'flat' ? 0 : -5])
  const rotateY = useTransform(smoothX, [-1, 1], [depth === 'flat' ? 0 : -7, depth === 'flat' ? 0 : 7])

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!motionEnabled || depth === 'flat') return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2)
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2)
  }

  const resetPointer = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <section
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      className="relative min-h-screen overflow-hidden bg-[#080807] text-white selection:bg-[color:var(--accent)] selection:text-black"
      style={{
        '--accent': colors.accent,
        '--accent-bright': colors.bright,
        '--accent-glow': colors.glow,
        '--accent-soft': colors.soft,
        '--accent-border': `${colors.accent}66`,
      } as CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.17] [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_74%)]" />
      <motion.div animate={motionEnabled ? { opacity: [0.35, 0.62, 0.35], scale: [0.96, 1.06, 0.96] } : undefined} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} className="pointer-events-none absolute left-1/2 top-[310px] h-[580px] w-[860px] -translate-x-1/2 rounded-full bg-[color:var(--accent-soft)] blur-[130px]" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1420px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--accent)]"><Brand /></a>
        <nav aria-label="Main navigation" className="hidden items-center gap-10 text-sm text-white/70 md:flex">
          {['Banking', 'Payments', 'Developers', 'Pricing'].map((item) => <a key={item} href={`#${item.toLowerCase()}`} className="transition-colors hover:text-white">{item}</a>)}
        </nav>
        <div className="flex items-center gap-3 sm:gap-5">
          <a href="#login" className="hidden text-sm text-white/75 transition-colors hover:text-white sm:block">Log in</a>
          <a href="#signup" className="rounded-lg bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#111009] shadow-[0_8px_26px_var(--accent-glow)] transition-transform hover:-translate-y-0.5 sm:px-6">Sign up</a>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pb-12 pt-14 text-center sm:px-8 sm:pt-20 lg:px-10 lg:pt-24">
        <motion.div initial={motionEnabled ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)] sm:text-[11px]">{eyebrow}</p>
          <h1 className="mx-auto mt-5 max-w-[980px] text-[clamp(3rem,6.4vw,5.6rem)] font-semibold leading-[0.96] tracking-[-0.065em] text-[#f4f2ed]">{headline}</h1>
          <p className="mx-auto mt-6 max-w-[630px] text-base leading-7 text-white/50 sm:text-lg">{description}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a id="signup" href="#create-account" className="group inline-flex items-center justify-center gap-3 rounded-xl bg-[color:var(--accent)] px-7 py-3.5 text-sm font-semibold text-[#111009] shadow-[0_12px_40px_var(--accent-glow)] transition-all hover:-translate-y-0.5 hover:bg-[color:var(--accent-bright)]">{primaryCtaLabel}<span className="transition-transform group-hover:translate-x-1"><ArrowIcon /></span></a>
            <a href="#sales" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.025] px-7 py-3.5 text-sm font-semibold text-white/85 backdrop-blur-sm transition-colors hover:bg-white/[0.07]">{secondaryCtaLabel}</a>
          </div>
        </motion.div>

        {showTrustRow && (
          <motion.div initial={motionEnabled ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.7 }} className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] text-white/47">
            {['Licensed EMI', 'Personal and business accounts', 'Card payments built in'].map((item) => <span key={item} className="flex items-center gap-2"><span className="text-[color:var(--accent)]"><CheckIcon /></span>{item}</span>)}
          </motion.div>
        )}

        {showProductNetwork && (
          <div className="relative mt-12 text-left sm:mt-16 lg:mt-20">
            <DesktopProductNetwork motionEnabled={motionEnabled} floatIntensity={amplitude} depthAmount={depthAmount} rotateX={rotateX} rotateY={rotateY} />
            <MobileProductNetwork motionEnabled={motionEnabled} floatIntensity={amplitude} depthAmount={depthAmount} />
          </div>
        )}
      </div>
    </section>
  )
}

export default HeroSection

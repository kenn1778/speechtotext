import { motion } from 'framer-motion'

const DUST_POSITIONS = [
  { top: '5%', left: '8%', size: 120, delay: 0 },
  { top: '15%', right: '12%', size: 80, delay: 0.5 },
  { top: '45%', left: '5%', size: 100, delay: 1 },
  { top: '70%', right: '8%', size: 140, delay: 0.3 },
  { top: '85%', left: '15%', size: 90, delay: 0.8 },
  { top: '30%', right: '20%', size: 60, delay: 1.2 },
  { bottom: '10%', right: '25%', size: 110, delay: 0.6 },
  { top: '60%', left: '25%', size: 70, delay: 0.9 },
]

function ThemeOverlay() {
  return (
    <>
      {DUST_POSITIONS.map((pos, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.06, 0.03, 0.07, 0.04] }}
          transition={{ duration: 8, delay: pos.delay, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute pointer-events-none rounded-full bg-white blur-3xl"
          style={{
            width: pos.size,
            height: pos.size,
            top: pos.top,
            left: pos.left,
            right: pos.right,
            bottom: pos.bottom,
          }}
        />
      ))}
    </>
  )
}

export default ThemeOverlay

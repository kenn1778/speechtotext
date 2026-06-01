import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Lightweight wrapper to use consistent animation props across components.
export function Reanimate({ children, className = '', style = {}, delay = 0 }) {
  const reduce = useReducedMotion()
  const transition = reduce ? { duration: 0 } : { duration: 0.45, delay }

  const initial = reduce ? {} : { opacity: 0, y: 10 }
  const exit = reduce ? {} : { opacity: 0, y: -6 }

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      exit={exit}
      transition={transition}
      className={`${className} overflow-hidden`}
      style={style}
    >
      {children}
    </motion.div>
  )
}

export default Reanimate

'use client'
import { motion } from 'framer-motion'
import { MessageSquare, FileText, Eye, GraduationCap, Code2, Zap, type LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: MessageSquare,
    title: 'Smart Conversations',
    description:
      'Engage in natural, flowing conversations on any topic with contextual understanding.',
  },
  {
    icon: FileText,
    title: 'File Understanding',
    description:
      'Upload PDFs, DOCX, and text files. Get summaries, explanations, and key insights.',
  },
  {
    icon: Eye,
    title: 'Image Understanding',
    description:
      'Analyze images, screenshots, and diagrams. Extract text and understand visual content.',
  },
  {
    icon: GraduationCap,
    title: 'Learning Assistance',
    description:
      'Get help with concepts, explanations, and study materials tailored to your level.',
  },
  {
    icon: Code2,
    title: 'Coding Help',
    description:
      'Write, debug, and understand code across multiple programming languages.',
  },
  {
    icon: Zap,
    title: 'Productivity Support',
    description:
      'Boost your workflow with writing, planning, and creative task assistance.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export default function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0c0c14]" />
      <div className="absolute inset-0 bg-gradient-radial-bottom" />
      <div className="absolute inset-0 bg-mesh" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="gradient-text-warm">What Wisely</span>{' '}
            <span className="text-white/90">Can Do</span>
          </h2>
          <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto">
            Powerful AI capabilities designed to assist you across every domain.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className="glass card-hover rounded-2xl p-6 group cursor-default"
              >
                {/* Icon */}
                <div className="relative mb-5">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-400/10 flex items-center justify-center border border-white/[0.06] group-hover:border-violet-500/30 transition-colors duration-300">
                    <Icon className="size-5 text-violet-400 group-hover:text-cyan-400 transition-colors duration-300" />
                  </div>
                  {/* Subtle glow behind icon on hover */}
                  <div className="absolute inset-0 size-11 rounded-xl bg-violet-500/0 group-hover:bg-violet-500/10 blur-xl transition-all duration-500" />
                </div>

                {/* Title */}
                <h3 className="text-white/90 font-semibold text-base mb-2 group-hover:text-white transition-colors duration-300">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-white/50 text-sm leading-relaxed group-hover:text-white/60 transition-colors duration-300">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

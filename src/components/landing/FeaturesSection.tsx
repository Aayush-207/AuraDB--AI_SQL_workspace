import { motion } from 'framer-motion';
import { MessageSquare, ShieldCheck, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Natural Language to SQL',
    description: 'Describe what you need in plain English. Our AI translates your intent into optimized PostgreSQL queries instantly.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe Transaction-Based Execution',
    description: 'Every mutation runs inside a transaction with preview. Review changes before they commit — rollback with one click.',
  },
  {
    icon: BarChart3,
    title: 'Intelligent Result Visualization',
    description: 'Automatically detect numeric patterns and render interactive charts. Export results in multiple formats.',
  },
];

const FeaturesSection = () => (
  <section className="relative py-32 px-6">
    <div className="max-w-6xl mx-auto">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Everything you need to <span className="text-gradient">work smarter</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          A complete toolkit for database interaction, powered by AI.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            className="glass rounded-2xl p-8 group cursor-default transition-all duration-300 hover:glow-border"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            whileHover={{ y: -4 }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;

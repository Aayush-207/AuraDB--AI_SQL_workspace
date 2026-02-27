import { motion } from 'framer-motion';
import { Shield, Eye, GitBranch, CheckCircle2, Lock } from 'lucide-react';

const securityFeatures = [
  { icon: Eye, text: 'Read-only safe mode' },
  { icon: GitBranch, text: 'Transaction preview before updates' },
  { icon: CheckCircle2, text: 'Query validation layer' },
  { icon: Lock, text: 'No credential storage' },
  { icon: Shield, text: 'Secure backend execution' },
];

const SecuritySection = () => (
  <section className="relative py-32 px-6">
    <div className="max-w-4xl mx-auto">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Built with <span className="text-gradient">Safety</span> in Mind
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Enterprise-grade security at every layer of the stack.
        </p>
      </motion.div>

      <div className="glass rounded-2xl p-8 md:p-12">
        <div className="space-y-6">
          {securityFeatures.map((feature, i) => (
            <motion.div
              key={feature.text}
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg">{feature.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default SecuritySection;

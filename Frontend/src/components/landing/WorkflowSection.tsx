import { motion } from 'framer-motion';
import workflowBackground from '../../../assets/Database(4).jpg';

const steps = [
  {
    title: 'Choose Database',
    description: 'Use the 3-way toggle to select PostgreSQL, MySQL, or MongoDB.',
  },
  {
    title: 'Connect Your DB',
    description:
      'Enter credentials for your local or cloud database (Supabase, Railway, RDS, MongoDB Atlas, etc.) and connect.',
  },
  {
    title: 'Chat in Natural Language',
    description:
      'Describe what you want (e.g., "Show me the top 10 customers by revenue this month").',
  },
  {
    title: 'Review & Run Query',
    description:
      'AuraDB shows the generated SQL/Mongo query. You can edit it and then execute.',
  },
  {
    title: 'Inspect Results & Export',
    description: 'View results in the table/chart panel and export to CSV if needed.',
  },
  {
    title: 'Commit Changes Safely',
    description:
      'For SQL databases, use BEGIN / COMMIT / ROLLBACK and Safe Mode to control data changes.',
  },
];

const WorkflowSection = () => (
  <section className="relative py-24 px-6 overflow-hidden">
    <img
      src={workflowBackground}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover object-center"
    />
    <div className="absolute inset-0 bg-black/55" />

    <div className="relative z-10 max-w-5xl mx-auto">
      <motion.div
        className="text-center mb-14"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">Workflow</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          How to <span className="text-gradient">Connect and Query</span>
        </h2>
        <p className="text-white/85 text-lg max-w-2xl mx-auto">
          Follow these simple steps to connect your database and run AI-assisted queries safely.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            className="glass rounded-2xl p-6 border border-border/50"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">{step.title}</h3>
                <p className="text-white/80 leading-relaxed">{step.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WorkflowSection;
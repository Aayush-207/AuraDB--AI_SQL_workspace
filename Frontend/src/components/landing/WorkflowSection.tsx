import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import workflowBackground from '../../../assets/Long.jpg';

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

const WorkflowSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const lastIndex = steps.length - 1;
  const bgProgress = activeStep / lastIndex;

  const goPrev = () => {
    if (activeStep === 0) return;
    setDirection(-1);
    setActiveStep((prev) => prev - 1);
  };

  const goNext = () => {
    if (activeStep === lastIndex) return;
    setDirection(1);
    setActiveStep((prev) => prev + 1);
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <motion.img
        src={workflowBackground}
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[175%] max-w-none object-cover"
        animate={{ x: `${-58 * bgProgress}%` }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
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

        <div className="relative max-w-5xl mx-auto min-h-[360px] md:min-h-[330px] px-2 md:px-6">
          <div className="relative max-w-3xl mx-auto min-h-[240px] md:min-h-[220px] perspective-[1200px]">
            <AnimatePresence mode="sync" custom={direction}>
              <motion.article
                key={activeStep}
                custom={direction}
                initial={{ x: -direction * 130, rotateY: -direction * 6 }}
                animate={{ x: 0, rotateY: 0 }}
                exit={{ x: direction * 130, rotateY: direction * 6 }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
                className="absolute inset-0 bg-black/35 backdrop-blur-sm rounded-2xl border border-white/20 p-6 md:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/25 text-primary font-bold flex items-center justify-center flex-shrink-0">
                    {activeStep + 1}
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold mb-3 text-white">{steps[activeStep].title}</h3>
                    <p className="text-white/85 leading-relaxed text-base md:text-lg">
                      {steps[activeStep].description}
                    </p>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={activeStep === 0}
              className="w-10 h-10 rounded-full bg-black/35 border border-white/20 text-white flex items-center justify-center transition-all hover:bg-black/50 disabled:opacity-35 disabled:cursor-not-allowed"
              aria-label="Previous step"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <p className="text-sm text-white/80 font-medium min-w-[92px] text-center">
              Step {activeStep + 1} of {steps.length}
            </p>

            <button
              type="button"
              onClick={goNext}
              disabled={activeStep === lastIndex}
              className="w-10 h-10 rounded-full bg-black/35 border border-white/20 text-white flex items-center justify-center transition-all hover:bg-black/50 disabled:opacity-35 disabled:cursor-not-allowed"
              aria-label="Next step"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
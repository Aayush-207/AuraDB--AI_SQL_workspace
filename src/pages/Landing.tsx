import { motion } from 'framer-motion';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import SecuritySection from '@/components/landing/SecuritySection';
import CTASection from '@/components/landing/CTASection';

const Landing = () => (
  <motion.div
    className="min-h-screen bg-background"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <HeroSection />
    <FeaturesSection />
    <SecuritySection />
    <CTASection />
  </motion.div>
);

export default Landing;

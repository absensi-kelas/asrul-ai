import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onUpdate?: () => void;
  render?: (text: string) => React.ReactNode;
}

export const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 10, onComplete, onUpdate, render }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      // Add a small random variation to speed for a more natural feel
      const variableSpeed = speed + Math.random() * 20;
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        if (onUpdate) onUpdate();
      }, variableSpeed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, onUpdate]);

  const content = render ? render(displayedText) : displayedText;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {content}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-1.5 h-4 ml-1 bg-neon-cyan align-middle shadow-[0_0_8px_rgba(0,243,255,0.8)]"
        />
      )}
    </motion.div>
  );
};

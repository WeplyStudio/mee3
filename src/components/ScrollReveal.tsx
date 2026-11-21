import React, { createContext, useContext } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Preserved for API compatibility
  distance?: number; // Preserved for API compatibility
}

const ScrollRevealSectionContext = createContext<boolean>(false);

/**
 * ScrollReveal
 * Keeps all child elements immediately visible at full layout opacity so the global
 * 4/5-viewport optical blur-to-sharp animation in GsapGlobalAnimator applies seamlessly
 * to every text, button, image, card, and icon without conflicting fade/clip animations.
 */
export const ScrollReveal: React.FC<Props> = ({
  children,
  className = '',
}) => {
  const isInsideRevealedSection = useContext(ScrollRevealSectionContext);

  if (isInsideRevealedSection) {
    return <div className={className}>{children}</div>;
  }

  return (
    <ScrollRevealSectionContext.Provider value={true}>
      <div className={className}>{children}</div>
    </ScrollRevealSectionContext.Provider>
  );
};

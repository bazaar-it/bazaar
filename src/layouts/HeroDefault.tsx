import React from 'react';
import { Button } from 'flowbite-react';

export interface HeroDefaultProps {
  headline?: string;
  subtext?: string;
  primaryCta?: string;
  secondaryCta?: string;
  backgroundImage?: string;
  className?: string;
}

/**
 * Default Hero Section Layout
 * Combines Flowbite components into a reusable hero template
 */
const HeroDefault: React.FC<HeroDefaultProps> = ({
  headline = "Welcome to Our Platform",
  subtext = "Create amazing experiences with our powerful tools",
  primaryCta = "Get Started",
  secondaryCta = "Learn More",
  backgroundImage,
  className = "",
}) => {
  const backgroundStyle = backgroundImage 
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <section 
      className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 px-6 ${className}`}
      style={backgroundStyle}
    >
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight">
          {headline}
        </h1>
        
        <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
          {subtext}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="xl"
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4"
          >
            {primaryCta}
          </Button>
          
          <Button 
            size="xl"
            color="light"
            outline
            className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-4"
          >
            {secondaryCta}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default HeroDefault; 
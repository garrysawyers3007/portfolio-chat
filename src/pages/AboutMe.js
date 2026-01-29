import React, { useState, useEffect } from 'react';
import './AboutMe.css';

const AboutMe = ({ resumeData }) => {
  const name = resumeData?.basic_info?.name || "Gauransh Sawhney";
  // The full text we want to type out
  const fullText = `Hi, I'm ${name}.`;
  
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 100); // Speed: 100ms per character

    return () => clearInterval(typeInterval);
  }, [fullText]);

  const role = resumeData?.basic_info?.role || "Full Stack Engineer";

  return (
    <section id="about-me" className="hero-section-clean">
      <div className="hero-content">
        
        {/* 1. Typewriter Headline */}
        <h1 className="hero-title">
          {typedText}<span className="cursor">|</span>
        </h1>
        
        {/* 2. Sub-headline */}
        <h2 className="hero-subtitle">
          {role}
        </h2>

        {/* 3. The "Chat Prompt" Line */}
        <div className="ai-prompt-wrapper">
          <p className="ai-prompt-text">
            Chat with an AI trained on my work.
            <br />
            <strong>Ask questions about my work below.</strong>
          </p>
          
          {/* 4. Visual Cue (Animated Arrow) */}
          <div className="arrow-indicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutMe;
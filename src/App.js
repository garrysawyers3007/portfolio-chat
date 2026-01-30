import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Analytics } from '@vercel/analytics/react';
import TopNav from './components/TopNav';
import ChatHistory from './components/ChatHistory';
import InputArea from './components/InputArea';
import SuggestionChips from './components/SuggestionChips';

import chatAPIClient from './services/chatAPIClient';

import AboutMe from './pages/AboutMe';
import Education from './pages/Education';
import Experience from './pages/Experience';
import Projects from './pages/Projects';
import Certifications from './pages/Certifications';
import ContactMe from './pages/ContactMe';

/* ===== Custom Hook: useInputNudge ===== */
const useInputNudge = () => {
  const [showNudge, setShowNudge] = useState(false);
  const inputRef = useRef(null);
  const nudgeTimeoutRef = useRef(null);

  useEffect(() => {
    // Check if nudge has already been shown in this session
    const hasShownNudge = sessionStorage.getItem('inputNudgeShown');

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (hasShownNudge || prefersReducedMotion) {
      return;
    }

    // Set nudge to show after 800ms
    nudgeTimeoutRef.current = setTimeout(() => {
      setShowNudge(true);
      sessionStorage.setItem('inputNudgeShown', 'true');

      // Stop nudge after 1s
      setTimeout(() => {
        setShowNudge(false);
      }, 1000);
    }, 800);

    // Handle early stop: clear nudge on input focus or typing
    const handleInputFocus = () => {
      if (nudgeTimeoutRef.current) {
        clearTimeout(nudgeTimeoutRef.current);
      }
      setShowNudge(false);
      sessionStorage.setItem('inputNudgeShown', 'true');
    };

    // Add listeners to textarea if it exists
    const inputElement = inputRef.current?.querySelector('.chat-input-area');
    if (inputElement) {
      inputElement.addEventListener('focus', handleInputFocus);
      inputElement.addEventListener('input', handleInputFocus);
    }

    return () => {
      if (inputElement) {
        inputElement.removeEventListener('focus', handleInputFocus);
        inputElement.removeEventListener('input', handleInputFocus);
      }
      if (nudgeTimeoutRef.current) {
        clearTimeout(nudgeTimeoutRef.current);
      }
    };
  }, []);

  return { showNudge, inputRef };
};

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default dark
  const [resumeData, setResumeData] = useState(null);
  const suggestionChipsRef = useRef(null);
  const hasScrolledOnFirstChatRef = useRef(false);

  // Use the nudge hook
  const { showNudge, inputRef } = useInputNudge();

  const suggestions = [
    { label: "Is Gauransh a good fit for my role?", icon: "💼" },
    { label: "How does this website work?", icon: "💻" },
    { label: "How can I contact Gauransh?", icon: "📬" }
  ];

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
      document.documentElement.dataset.theme = savedTheme;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
    }
  }, []);

  // Update data-theme and localStorage when isDarkMode changes
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);

    // Update favicon based on theme
    const favicon = document.getElementById('favicon');
    if (favicon) {
      favicon.href = isDarkMode ? '/dark_logo.png' : '/light_logo.png';
    }
  }, [isDarkMode]);

  useEffect(() => {
    fetch('/data/resume.json') 
      .then(res => res.json())
      .then(data => setResumeData(data))
      .catch(err => console.error("Failed to load resume data:", err));
  }, []);

  useEffect(() => {
    if (messages.length === 0 || hasScrolledOnFirstChatRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollToChips = () => {
      const target = suggestionChipsRef.current;
      if (!target) return;

      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'end'
      });

      const rect = target.getBoundingClientRect();
      const bottom = rect.bottom + window.scrollY;
      const desiredTop = bottom - window.innerHeight + 16;
      window.scrollTo({
        top: Math.max(desiredTop, 0),
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });

      hasScrolledOnFirstChatRef.current = true;
    };

    requestAnimationFrame(() => requestAnimationFrame(scrollToChips));
    const retryId = setTimeout(scrollToChips, 250);
    return () => clearTimeout(retryId);
  }, [messages.length]);

  const handleSend = (text) => {
    if (!text.trim() || isLoading) return;
    
    // Add user message immediately
    setMessages(prev => [...prev, { text, sender: 'user' }]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const conversationHistory = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    chatAPIClient.sendMessage(text, conversationHistory)
        .then(reply => {
           setIsLoading(false);
           setMessages(prev => [...prev, { text: reply, sender: 'bot' }]);
        })
        .catch(err => {
            setIsLoading(false);
            setError(err.message);
        });
  };

  // We no longer need handleCloseChat because the chat is inline/permanent

  return (
    <div className="app-container appBackground">
      <TopNav isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} />

      <main className="main-content">
        
        {/* 1. HERO / LANDING AREA */}
        <div className="landing-wrapper">
          
          {/* Header Section */}
          <AboutMe resumeData={resumeData} />
          
          {/* INLINE CHAT AREA: Only renders if there are messages */}
          {messages.length > 0 && (
            <div className="inline-chat-container">
              <ChatHistory 
                messages={messages} 
                isLoading={isLoading} 
                // No onClose needed for inline
              />
            </div>
          )}
          
          {/* Input Section */}
          <div className={`input-wrapper${showNudge ? ' input-nudge' : ''}`} ref={inputRef}>
             <InputArea input={input} onInputChange={setInput} onSend={handleSend} disabled={isLoading} />
          </div>
          
          {/* Chips */}
          <div ref={suggestionChipsRef}>
            <SuggestionChips suggestions={suggestions} onChipClick={handleSend} disabled={isLoading} />
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </div>

        {/* 2. SCROLLABLE SECTIONS */}
        {resumeData && (
          <>
            <Experience resumeExperience={resumeData.experience} />
            <Projects resumeProjects={resumeData.projects} />
            <Education resumeEducation={resumeData.education} />
            <Certifications resumeCertifications={resumeData.certifications} />
            <ContactMe socialLinks={resumeData.socials} />
          </>
        )}
      </main>
      <Analytics />
    </div>
  );
};

export default App;
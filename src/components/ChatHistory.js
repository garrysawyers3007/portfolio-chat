/* src/components/ChatHistory.js */
import React, { useEffect, useRef } from 'react';

const ChatHistory = ({ messages, isLoading, chatEndRef, onCloseChat }) => {

  const containerRef = useRef(null);

  // 2. Auto-scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    if (containerRef.current) {
      const { scrollHeight, clientHeight } = containerRef.current;
      // This sets the scroll position to the very bottom immediately
      containerRef.current.scrollTop = scrollHeight - clientHeight;
      
      // Optional: If you want it smooth, use this instead:
      containerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // --- HANDLER FACTORY: Create scroll handlers to avoid repetition ---
  const createScrollHandler = (sectionId) => () => {
    if (onCloseChat) onCloseChat();
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  // const handleScrollToAbout = createScrollHandler('about-me');
  const handleScrollToEducation = createScrollHandler('education');
  const handleScrollToExperience = createScrollHandler('experience');
  const handleScrollToProjects = createScrollHandler('projects');
  const handleScrollToCertifications = createScrollHandler('certifications');
  const handleScrollToContact = createScrollHandler('contact');

  // --- FORMATTER 1: Parse Bold Text (**text**) ---
  const parseBold = (text) => {
    return text.split('**').map((part, index) => {
      return index % 2 === 1 ? <strong key={index}>{part}</strong> : part;
    });
  };

  // --- FORMATTER 2: Parse Links ([text](url)) THEN Bold ---
  const parseFormattedText = (text) => {
    // Regex matches [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = text.split(linkRegex); 
    
    const result = [];
    for (let i = 0; i < parts.length; i += 3) {
      // 1. Handle plain text
      if (parts[i]) {
        result.push(<React.Fragment key={`text-${i}`}>{parseBold(parts[i])}</React.Fragment>);
      }
      // 2. Handle link
      if (i + 1 < parts.length) {
        const label = parts[i+1];
        const url = parts[i+2];
        result.push(
          <a 
            key={`link-${i}`} 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="chat-link"
          >
            {label}
          </a>
        );
      }
    }
    return result;
  };

  // --- FORMATTER 3: Main Layout (Newlines, Bullets, Lists) ---
  const formatMessage = (text) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: '8px' }} />; // Paragraph break

      // Detect Bullet Points (*, -, •)
      const isBullet = /^[•*-]\s/.test(trimmed);
      
      // Detect Numbered Lists (1., 2., 10.)
      const isNumbered = /^\d+\.\s/.test(trimmed);

      if (isBullet) {
        const cleanLine = trimmed.replace(/^[•*-]\s+/, '');
        return (
          <div key={i} className="chat-list-item bullet">
            <span className="list-marker">•</span>
            <span>{parseFormattedText(cleanLine)}</span>
          </div>
        );
      }

      if (isNumbered) {
        const match = trimmed.match(/^(\d+\.)\s+(.*)/);
        if (match) {
          const number = match[1];
          const content = match[2];
          return (
            <div key={i} className="chat-list-item numbered">
              <span className="list-marker">{number}</span>
              <span>{parseFormattedText(content)}</span>
            </div>
          );
        }
      }

      // Standard Line
      return (
        <div key={i} className="chat-paragraph">
          {parseFormattedText(line)}
        </div>
      );
    });
  };

  // --- RENDERER: Combines Logic + Formatting ---
  const renderMessageContent = (text) => {
    // 1. Detect Actions (Check your original tags)
    
    const hasEducationAction = text.includes("ACTION:SCROLL_EDUCATION");
    const hasExperienceAction = text.includes("ACTION:SCROLL_EXPERIENCE");
    const hasProjectsAction = text.includes("ACTION:SCROLL_PROJECTS");
    const hasCertificationsAction = text.includes("ACTION:SCROLL_CERTIFICATIONS");
    const hasContactAction = text.includes("ACTION:SCROLL_CONTACT");

    // 2. Clean Tags (Remove all action tags using Regex)
    let cleanText = text
      .replace(/<?<?ACTION:SCROLL_[A-Z_]+>?>?/g, "") 
      .trim();

    return (
      <div className="message-content">
        {/* Render Formatted Text */}
        <div className="text-wrapper">
          {formatMessage(cleanText)}
        </div>
        
        {/* Render Original Buttons */}
        {/* {hasAboutAction && (
          <button className="chat-action-btn" onClick={handleScrollToAbout}>
            👇 Read more in About Me section
          </button>
        )} */}

        {hasEducationAction && (
          <button className="chat-action-btn" onClick={handleScrollToEducation}>
            🎓 View Education Details
          </button>
        )}

        {hasExperienceAction && (
          <button className="chat-action-btn" onClick={handleScrollToExperience}>
            💼 View Work History
          </button>
        )}

        {hasProjectsAction && (
          <button className="chat-action-btn" onClick={handleScrollToProjects}>
            🚀 View Projects
          </button>
        )}

        {hasCertificationsAction && (
          <button className="chat-action-btn" onClick={handleScrollToCertifications}>
            📜 View Certifications
          </button>
        )}

        {hasContactAction && (
          <button className="chat-action-btn" onClick={handleScrollToContact}>
             📬 Get In Touch
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="chat-history" ref={containerRef}>
      {messages.map((msg, idx) => (
        <div key={idx} className={`message ${msg.sender}`}>
          {/* Bot messages get parsed, User messages are plain text */}
          {msg.sender === 'bot' ? renderMessageContent(msg.text) : msg.text}
        </div>
      ))}
      {isLoading && (
        <div className="message bot">
          <span className="typing-indicator">Thinking...</span>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatHistory;
import React, { useState } from 'react';

const InputArea = ({ input, onInputChange, onSend, disabled }) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = React.useRef(null);
  
  const handleKeyDown = (e) => {
    // If Enter is pressed WITHOUT Shift -> Send Message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents creating a new line
      onSend(input);
    }
    // If Enter IS pressed WITH Shift -> Do nothing (let browser insert new line)
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    onInputChange(value);
    
    // Set typing state
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Reset typing state after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className={`input-wrapper console-input${isTyping ? ' is-typing' : ''}`}>
      <textarea
        className="chat-input-area"
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        rows={1} // Starts as a single line
      />
      <button
        className="console-send-btn"
        onClick={() => onSend(input)}
        disabled={disabled || !input.trim()}
        aria-label="Send message"
        title="Send (Enter)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M4 12L20 4l-4.5 16-3.5-5-5-3.5z" fill="currentColor" opacity="0.12" />
          <path d="M4 12L20 4l-4.5 16-3.5-5-5-3.5z" />
        </svg>
      </button>
    </div>
  );
};

export default InputArea;
import React, { useState } from 'react';
import './ContactMe.css';
import SectionHeader from '../components/SectionHeader';

const ContactMe = ({ socialLinks }) => {
  // Initialize hook before any conditional returns
  const [copied, setCopied] = useState(false);

  if (!socialLinks || socialLinks.length === 0) return null;

  // Extract email from socials if present
  const emailLink = socialLinks.find(link => link.type === 'email');
  const emailAddress = emailLink ? emailLink.url.replace('mailto:', '') : null;

  const handleCopy = async () => {
    if (!emailAddress) return;
    try {
      await navigator.clipboard.writeText(emailAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      // Fallback: select text by creating a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = emailAddress;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleEmailKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy();
    }
  };

  const getIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'linkedin':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
        );
      case 'github':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      case 'email':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        );
    }
  };

  const socialWithoutEmail = socialLinks.filter(link => link.type.toLowerCase() !== 'email');
  const showEmailLabel = socialWithoutEmail.length > 0;

  return (
    <section id="contact" className="section contact-section">
      <div className="container contact-container">
        <SectionHeader title="Contact Me" />

        <div className="card contact-panel">
          <p className="contact-pitch">Open to SWE / AI roles — happy to chat.</p>

          {emailAddress && (
            <div className="email-stack">
              {showEmailLabel && (
                <div className="contact-label-muted">Email</div>
              )}
              <div
                className={`email-row-clean ${copied ? 'copied' : ''}`}
                aria-label="Email address (click to copy)"
                role="button"
                tabIndex={0}
                onClick={handleCopy}
                onKeyDown={handleEmailKeyDown}
              >
                <div className="email-text" title={emailAddress}>{emailAddress}</div>
                <button
                  type="button"
                  className={`copy-icon-btn ${copied ? 'copied' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCopy();
                  }}
                  aria-label={copied ? 'Email copied to clipboard' : 'Copy email to clipboard'}
                  aria-live="polite"
                  aria-atomic="true"
                  title={copied ? 'Copied' : 'Copy email'}
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M9.5 16.5 5 12l1.4-1.4 3.1 3.1 7.1-7.2L18 8.1z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M8 7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7Zm-3 3a1 1 0 0 1 1-1h1v2H6v8h9v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
                    </svg>
                  )}
                </button>
                <span
                  className={`copy-feedback ${copied ? 'visible' : ''}`}
                  aria-live="polite"
                >
                  Copied
                </span>
              </div>
            </div>
          )}

          <div className="contact-row social-row">
            <div className="contact-label">Find me on</div>
            <div className="social-icons-wrapper">
              {socialWithoutEmail.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-button"
                  aria-label={link.name || link.type}
                  title={link.name}
                >
                  {getIcon(link.type)}
                </a>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ContactMe;
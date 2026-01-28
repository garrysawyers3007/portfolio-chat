import React from 'react';
import './Experience.css';
import SectionHeader from '../components/SectionHeader';

const Experience = ({ resumeExperience }) => {
  if (!resumeExperience || resumeExperience.length === 0) return null;

  return (
    <section id="experience" className="section experience-section">
      <div className="container experience-container">
        <SectionHeader title="Experience" />
        
        <div className="experience-list">
          {resumeExperience.map((job, index) => {
            const isCurrent = index === 0;
            return (
              <div key={index} className={`experience-item ${isCurrent ? 'current' : ''}`}>
                <div className="timeline-col">
                  <span className="timeline-dot" aria-hidden="true" />
                </div>

                <div className="card experience-card">
                  {/* Left Column: Logo */}
                  <div className="exp-logo-container">
                    {job.logoUrl ? (
                      <img src={job.logoUrl} alt={`${job.company} logo`} className="exp-logo" />
                    ) : (
                      <div className="exp-logo-fallback">{job.company.charAt(0)}</div>
                    )}
                  </div>

                  {/* Right Column: Content */}
                  <div className="exp-content">
                    <div className="exp-header">
                      <div className="exp-top-row">
                        <div className="exp-title-wrapper">
                          <h3 className="exp-company">{job.company}</h3>
                          {isCurrent && <span className="current-badge">Current</span>}
                        </div>
                        <span className="exp-date">{job.years}</span>
                      </div>
                      <div className="exp-role">{job.title}</div>
                    </div>

                    {job.description && (
                      <p className="exp-description">{job.description}</p>
                    )}

                    {job.technologies && job.technologies.length > 0 && (
                      <div className="exp-tech-stack">
                        {job.technologies.map((tech, i) => (
                          <span key={i} className="chip">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Experience;
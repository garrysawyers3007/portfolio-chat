import React, { useState } from 'react';
import './Projects.css';
import SectionHeader from '../components/SectionHeader';

const Projects = ({ resumeProjects }) => {
  const [expandedProjects, setExpandedProjects] = useState({});

  if (!resumeProjects || resumeProjects.length === 0) return null;

  const toggleExpand = (index) => {
    setExpandedProjects(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <section id="projects" className="section projects-section">
      <div className="container projects-container">
        <SectionHeader title="Projects" />
        
        <div className="projects-grid">
          {resumeProjects.map((project, index) => (
            <div key={index} className={`card project-card ${project.featured ? 'featured' : ''}`}>
              
              {/* Top Row: Title + Date */}
              <div className="project-header">
                <h3 className="project-title">{project.title}</h3>
                <span className="project-date">{project.date}</span>
              </div>
              
              {/* Highlight: One-line impact summary */}
              {project.highlight && (
                <p className="project-highlight">{project.highlight}</p>
              )}
              
              {/* Body: Clamped Description */}
              <div className="project-description-wrapper">
                <p className={`project-description ${expandedProjects[index] ? 'expanded' : ''}`}>
                  {project.description}
                </p>
                {project.description && project.description.length > 120 && (
                  <button 
                    className={`expand-btn ${expandedProjects[index] ? 'expanded' : ''}`}
                    onClick={() => toggleExpand(index)}
                    aria-label={expandedProjects[index] ? 'Show less' : 'Show more'}
                    aria-expanded={expandedProjects[index]}
                  >
                    <svg className="expand-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span>{expandedProjects[index] ? 'Show less' : 'Show more'}</span>
                  </button>
                )}
              </div>
              
              {/* Tech Stack: Chip Elements */}
              <div className="project-tech">
                {project.technologies && project.technologies.map((tech, i) => (
                  <span key={i} className="chip">{tech}</span>
                ))}
              </div>

              {/* Actions Row: Clear call-to-action */}
              <div className="project-actions">
                {project.url && (
                  <a 
                    href={project.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="project-action-btn"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                    <span>View on GitHub</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
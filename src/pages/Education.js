import React from 'react';
import './Education.css';
import SectionHeader from '../components/SectionHeader';

const Education = ({ resumeEducation }) => {
  // Guard clause: if data hasn't loaded yet, don't render anything
  if (!resumeEducation) return null;

  return (
    <section id="education" className="section education-section">
      <div className="container education-container">
        <SectionHeader title="Education" />
        
        <div className="education-list">
          {resumeEducation.map((edu, index) => (
            <div key={index} className="card education-card">
              <div className="edu-logo-wrapper">
                <img src={edu.logoUrl} alt={`${edu.school} logo`} className="edu-logo" />
              </div>
              
              <div className="edu-details">
                <h3 className="edu-school">{edu.school}</h3>
                <p className="edu-degree">{edu.degree}</p>
                <div className="edu-metadata-row">
                  <span className="edu-gpa-label">GPA</span>
                  <span className="edu-gpa-value">{edu.gpa}</span>
                  <span className="edu-separator" aria-hidden="true">•</span>
                  <span className="edu-date">{edu.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Education;
import React from 'react';
import './Certifications.css';
import SectionHeader from '../components/SectionHeader';

const Certifications = ({ resumeCertifications = [] }) => {
  if (!resumeCertifications || resumeCertifications.length === 0) return null;

  const extractYear = (dateStr) => {
    const match = dateStr.match(/(\d{4})/);
    return match ? match[1] : dateStr;
  };

  const extractBadgeText = (organization) => {
    // Extract 1–2 letter badge from organization name
    if (!organization) return '?';
    const cleaned = organization.trim().toUpperCase();
    // Prefer first 2 letters; fallback to first letter
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2);
    }
    return cleaned.charAt(0);
  };

  // Inline external link SVG icon
  const ExternalLinkIcon = () => (
    <svg className="cert-external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );

  return (
    <section id="certifications" className="section certifications-section">
      <div className="container certifications-container">
        <SectionHeader title="Licenses & Certifications" />

        <div className="certifications-grid">
          {resumeCertifications.map((cert, index) => (
            <a
              key={index}
              href={cert.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="cert-chip"
              title={cert.title}
            >
              {/* Badge */}
              <div className="cert-badge">
                {extractBadgeText(cert.organization)}
              </div>

              {/* Content: Title + Organization */}
              <div className="cert-content">
                <div className="cert-title">{cert.title}</div>
                <div className="cert-organization">{cert.organization}</div>
              </div>

              {/* Year + External Icon */}
              <div className="cert-meta">
                <div className="cert-year">{extractYear(cert.date)}</div>
                <ExternalLinkIcon />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Certifications;

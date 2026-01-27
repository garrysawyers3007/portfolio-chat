import React from 'react';

const SectionHeader = ({ title, className = '' }) => {
  return (
    <div className={`sectionHeaderGroup ${className}`}>
      <div className="sectionHeader">
        <h2 className="sectionTitle">{title}</h2>
      </div>
    </div>
  );
};

export default SectionHeader;

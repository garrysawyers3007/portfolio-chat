import React from 'react';

const SuggestionChips = ({ suggestions, onChipClick, disabled }) => {
  return (
    <div className="suggestions-row">
      {suggestions.map((chip, idx) => (
        <button
          key={idx}
          className="chip"
          onClick={() => onChipClick(chip.label)}
          disabled={disabled}
        >
          <span className="chip-icon">{chip.icon}</span>
          {chip.label}
        </button>
      ))}
    </div>
  );
};

export default SuggestionChips;

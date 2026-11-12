"use client";

import React, { memo } from 'react';

interface Suggestion {
  id?: string | number;
  name: string;
  pathString?: string;
  score?: number;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onSelect: (suggestion: Suggestion) => void;
  isHighlighted: boolean;
  searchQuery: string;
  index: number;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onSelect,
  isHighlighted,
  searchQuery,
  index,
}) => {
  const highlightMatch = (text: string, query: string): string => {
    if (!query) return text;
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<span class="suggestion-highlight">$1</span>');
    } catch (e) {
      console.error('Regex hatası:', e);
      return text;
    }
  };

  const getMatchClass = (): string => {
    if (!suggestion.score) return '';
    if (suggestion.score >= 90) return 'suggestion-exact-match';
    if (suggestion.score >= 70) return 'suggestion-strong-match';
    if (suggestion.score >= 40) return 'suggestion-medium-match';
    return '';
  };

  const handleClick = () => onSelect(suggestion);

  const highlightedName = highlightMatch(suggestion.name, searchQuery);

  return (
    <div
      className={`suggestion-card ${isHighlighted ? 'suggestion-highlighted' : ''} ${getMatchClass()}`}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      tabIndex={0}
      role="option"
      aria-selected={isHighlighted}
      id={`suggestion-${index}`}
    >
      <div
        className="suggestion-name"
        dangerouslySetInnerHTML={{ __html: highlightedName }}
      />
      {suggestion.pathString && (
        <div className="suggestion-path">
          <span className="suggestion-path-icon">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
          {suggestion.pathString}
        </div>
      )}
    </div>
  );
};

export default memo(SuggestionCard);

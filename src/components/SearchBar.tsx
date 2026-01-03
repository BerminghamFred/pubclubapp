'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, MapPin, Tag, Beer } from 'lucide-react';
import { searchSuggestions, getAllSuggestions, generateSearchUrl, SearchSuggestion } from '@/utils/searchUtils';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (selections: SearchSuggestion[]) => void;
  variant?: 'default' | 'hero';
  selections?: SearchSuggestion[]; // Controlled selections from parent
}

export default function SearchBar({ 
  placeholder = "Search by features, area, or pub name", 
  className = "",
  onSearch,
  variant = 'default',
  selections: externalSelections // Use external selections if provided (controlled component)
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  // Use external selections if provided (controlled), otherwise maintain internal state (uncontrolled)
  const [internalSelections, setInternalSelections] = useState<SearchSuggestion[]>([]);
  const isControlled = externalSelections !== undefined;
  const selections = isControlled ? externalSelections : internalSelections;
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const onSearchRef = useRef(onSearch);
  const router = useRouter();

  // Keep onSearch ref up to date
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Update suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      const newSuggestions = getAllSuggestions(query, 8);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
      setFocusedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  // Clear suggestions when selections change
  useEffect(() => {
    if (selections.length > 0) {
      setShowSuggestions(false);
    }
  }, [selections]);

  // Automatically trigger search when selections change (only for uncontrolled/internal state)
  // For controlled components, the parent handles updates
  useEffect(() => {
    if (!isControlled && onSearchRef.current && internalSelections.length > 0) {
      onSearchRef.current(internalSelections);
    }
  }, [internalSelections, isControlled]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[focusedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setFocusedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, focusedIndex, query]);

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    // Check if already selected
    const isAlreadySelected = selections.some(s => s.id === suggestion.id);
    
    if (!isAlreadySelected) {
      const newSelections = [...selections, suggestion];
      // If controlled, call onSearch; otherwise update internal state
      if (isControlled) {
        if (onSearchRef.current) {
          onSearchRef.current(newSelections);
        }
      } else {
        setInternalSelections(newSelections);
      }
    }
    
    // Clear the input and hide suggestions
    setQuery('');
    setShowSuggestions(false);
    setFocusedIndex(-1);
    
    // Focus back on input
    inputRef.current?.focus();
  };

  const removeSelection = (selectionId: string) => {
    const newSelections = selections.filter(s => s.id !== selectionId);
    // If controlled, call onSearch; otherwise update internal state
    if (isControlled) {
      if (onSearchRef.current) {
        onSearchRef.current(newSelections);
      }
    } else {
      setInternalSelections(newSelections);
    }
  };

  const handleSearch = () => {
    if (selections.length > 0) {
      const url = generateSearchUrl(selections);
      router.push(url);
      
      if (onSearch) {
        onSearch(selections);
      }
    } else if (query.trim()) {
      // If no selections but there's a query, search for the query
      router.push(`/pubs?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'area': return <MapPin className="w-4 h-4" />;
      case 'amenity': return <Tag className="w-4 h-4" />;
      case 'pub': return <Beer className="w-4 h-4 text-amber-800" />;
      default: return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full pl-12 pr-4 py-4 text-sm md:text-base rounded-lg focus:outline-none focus:ring-4 ${
            variant === 'hero' 
              ? 'focus:ring-white/20 text-gray-900 placeholder-gray-500 border-0' 
              : 'focus:ring-[#08d78c]/20 text-gray-900 placeholder-gray-500 border border-gray-300 bg-white'
          }`}
        />
      </div>

      {/* Selected Items - Removed to avoid duplication with FilterChips */}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto"
        >
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionSelect(suggestion)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                  index === focusedIndex ? 'bg-gray-50' : ''
                } ${index === 0 ? 'rounded-t-lg' : ''} ${
                  index === suggestions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100'
                }`}
              >
                <div className={`p-1.5 rounded-full ${suggestion.color}`}>
                  {getTypeIcon(suggestion.type)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{suggestion.text}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {suggestion.type === 'area' && 'Area'}
                    {suggestion.type === 'amenity' && 'Feature'}
                    {suggestion.type === 'pub' && 'Pub'}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {suggestion.type === 'area' && '📍'}
                  {suggestion.type === 'amenity' && '🏷️'}
                  {suggestion.type === 'pub' && '🍺'}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-center text-gray-500">
              <div className="text-sm">No suggestions found for "{query}"</div>
              <div className="text-xs mt-1">Try searching for areas, features, or pub names</div>
            </div>
          )}
        </div>
      )}

      {/* Helper Text - Removed since search is now automatic */}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { MapPin } from 'lucide-react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (lat: number, lng: number, name: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  rightActions?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  icon,
  rightActions,
  onFocus,
  onBlur
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 3) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5`);
        const data = await res.json();
        if (data.features) {
          setSuggestions(data.features);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleSelect = (feature: any) => {
    const coords = feature.geometry.coordinates; // [lng, lat]
    const props = feature.properties;
    
    // Construct a nice display name
    const parts = [];
    if (props.name) parts.push(props.name);
    if (props.city && props.city !== props.name) parts.push(props.city);
    if (props.state && props.state !== props.city) parts.push(props.state);
    
    const displayName = parts.join(', ') || 'Selected Location';
    
    onChange(displayName);
    onSelect(coords[1], coords[0], displayName); // lat, lng
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center w-full">
        {icon && <div className="absolute left-3 z-10">{icon}</div>}
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (onFocus) onFocus();
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          className={className}
        />
        {rightActions && <div className="absolute right-2 z-10 flex items-center">{rightActions}</div>}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((feature, index) => {
            const props = feature.properties;
            const title = props.name || props.city || props.state;
            const subtitle = [props.city, props.state, props.country].filter(Boolean).join(', ');
            
            return (
              <button
                key={index}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3 transition-colors"
                onClick={() => handleSelect(feature)}
              >
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{title}</span>
                  {subtitle && subtitle !== title && (
                    <span className="text-xs text-gray-500">{subtitle}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

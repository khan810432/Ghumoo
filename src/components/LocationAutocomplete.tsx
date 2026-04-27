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
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1`);
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data);
        }
      } catch (error) {
        console.warn("Failed to fetch location suggestions", error);
        // Do not crash the UI, keep existing suggestions or clear
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 800);
    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleSelect = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    
    const displayName = item.display_name || item.name || 'Selected Location';
    
    onChange(displayName);
    onSelect(lat, lng, displayName);
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
          {suggestions.map((item, index) => {
            const address = item.address || {};
            const title = item.name || address.city || address.town || address.village || address.suburb || address.state || item.display_name.split(',')[0];
            const subtitle = item.display_name;
            
            return (
              <button
                key={index}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3 transition-colors"
                onClick={() => handleSelect(item)}
              >
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{title}</span>
                  {subtitle && subtitle !== title && (
                    <span className="text-xs text-gray-500 truncate w-[400px]">{subtitle}</span>
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

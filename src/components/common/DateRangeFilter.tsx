
import { useState, useRef, useEffect } from 'react';
import { Calendar, X, ChevronDown } from 'lucide-react';
import './DateRangeFilter.css';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFilter = startDate || endDate;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    // Don't close dropdown here, optional choice
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const buttonText = hasFilter
    ? `${formatDate(startDate)} - ${formatDate(endDate) || '...'}`
    : 'Toutes les dates';

  return (
    <div className="date-filter-container" ref={containerRef}>
      <button 
        className={`btn btn-secondary date-filter-btn ${hasFilter ? 'active-filter' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={hasFilter ? "Modifier le filtre" : "Filtrer par date"}
      >
        <Calendar size={18} />
        <span className="filter-text">{buttonText}</span>
        {hasFilter ? (
          <div 
            className="clear-filter-btn" 
            onClick={handleClear}
            title="Effacer"
          >
            <X size={14} />
          </div>
        ) : (
          <ChevronDown size={16} />
        )}
      </button>

      {isOpen && (
        <div className="date-filter-dropdown">
          <div className="date-filter-header">
            <h4>Période</h4>
          </div>
          <div className="date-inputs-row">
            <div className="date-field">
              <span className="field-label">Du</span>
              <input
                type="date"
                className="form-input form-input-sm"
                value={startDate}
                onChange={(e) => onChange(e.target.value, endDate)}
              />
            </div>
            <div className="date-field">
              <span className="field-label">Au</span>
              <input
                type="date"
                className="form-input form-input-sm"
                value={endDate}
                min={startDate}
                onChange={(e) => onChange(startDate, e.target.value)}
              />
            </div>
          </div>
          <div className="filter-actions">
             <button 
               className="btn btn-sm btn-primary w-full"
               onClick={() => setIsOpen(false)}
             >
               Appliquer
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
}

export function CustomSelect({ value, onChange, options, placeholder = '请选择...', className = '' }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
          w-full px-3 py-2 text-left text-sm
          bg-white/60 backdrop-blur-sm
          border border-cyan-200 rounded-xl
          hover:border-cyan-400 hover:bg-white/80
          focus:outline-none focus:ring-2 focus:ring-cyan-400/50
          transition-all duration-200
          flex items-center justify-between gap-2
          ${isOpen ? 'ring-2 ring-cyan-400/50 border-cyan-400' : ''}
        `}
            >
                <span className={selectedOption ? 'text-gray-800' : 'text-gray-400'}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-cyan-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute z-[9999] w-full mt-1 py-1 bg-white/95 backdrop-blur-md border border-cyan-200 rounded-xl shadow-2xl overflow-hidden"
                    style={{
                        animation: 'slideDown 0.2s ease-out forwards',
                    }}
                >
                    <style>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-8px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
                    <div className="max-h-60 overflow-auto">
                        {options.map((option, index) => {
                            const isSelected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                    w-full px-3 py-2 text-left text-sm
                    flex items-center justify-between gap-2
                    transition-all duration-200
                    ${isSelected
                                            ? 'bg-gradient-to-r from-cyan-500/10 to-teal-500/10 text-cyan-700'
                                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-teal-50'
                                        }
                  `}
                                    style={{
                                        animation: `fadeSlideIn 0.15s ease-out ${index * 0.03}s forwards`,
                                        opacity: 0,
                                    }}
                                >
                                    <style>{`
                    @keyframes fadeSlideIn {
                      from {
                        opacity: 0;
                        transform: translateX(-8px);
                      }
                      to {
                        opacity: 1;
                        transform: translateX(0);
                      }
                    }
                  `}</style>
                                    <span className={isSelected ? 'font-medium' : ''}>{option.label}</span>
                                    {isSelected && (
                                        <Check className="w-4 h-4 text-cyan-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact version for inline use - uses portal for proper z-index
interface MiniSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    className?: string;
}

export function MiniSelect({ value, onChange, options, className = '' }: MiniSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 120),
            });
        }
    }, [isOpen]);

    return (
        <div className={`relative inline-block ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
          px-2.5 py-1.5 text-xs
          bg-gradient-to-r from-cyan-50 to-teal-50
          border border-cyan-200 rounded-lg
          hover:from-cyan-100 hover:to-teal-100 hover:border-cyan-300
          focus:outline-none focus:ring-2 focus:ring-cyan-400/50
          transition-all duration-200
          flex items-center gap-1.5
          shadow-sm hover:shadow
          ${isOpen ? 'ring-2 ring-cyan-400/50 from-cyan-100 to-teal-100' : ''}
        `}
            >
                <span className="text-cyan-700 font-medium">{selectedOption?.label || '...'}</span>
                <ChevronDown
                    className={`w-3.5 h-3.5 text-cyan-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed py-1 bg-white/98 backdrop-blur-md border border-cyan-200 rounded-xl shadow-2xl overflow-hidden"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        minWidth: dropdownPosition.width,
                        zIndex: 99999,
                        animation: 'dropdownSlide 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    }}
                >
                    <style>{`
            @keyframes dropdownSlide {
              from {
                opacity: 0;
                transform: translateY(-10px) scale(0.9);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            @keyframes itemSlide {
              from {
                opacity: 0;
                transform: translateX(-6px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>
                    <div className="max-h-48 overflow-auto">
                        {options.map((option, index) => {
                            const isSelected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                    w-full px-3 py-2 text-left text-xs
                    flex items-center justify-between gap-2
                    transition-all duration-200
                    ${isSelected
                                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white'
                                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-teal-50'
                                        }
                  `}
                                    style={{
                                        animation: `itemSlide 0.2s ease-out ${index * 0.04}s forwards`,
                                        opacity: 0,
                                    }}
                                >
                                    <span className={isSelected ? 'font-medium' : ''}>{option.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';

/**
 * Utility to format numbers with thousand separator commas (e.g. 10000000 -> 10,000,000)
 */
export function formatWithCommas(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const str = val.toString().replace(/,/g, '');
  if (isNaN(Number(str))) return val.toString();
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Utility to parse comma-separated string back to numeric float/integer
 */
export function parseFormattedNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

interface FormattedNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Reusable Comma-Separated Number Input Component for Nominal and Notional fields
 */
export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  className = 'w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-blue-500',
  placeholder = 'e.g. 10,000,000',
  id,
  disabled = false,
  required = false
}) => {
  const [inputValue, setInputValue] = useState<string>(formatWithCommas(value));

  useEffect(() => {
    setInputValue(formatWithCommas(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleanStr = raw.replace(/[^0-9.-]/g, '');
    const numericVal = parseFormattedNumber(cleanStr);
    setInputValue(formatWithCommas(cleanStr));
    onChange(numericVal);
  };

  return (
    <input
      type="text"
      id={id}
      disabled={disabled}
      required={required}
      value={inputValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
};

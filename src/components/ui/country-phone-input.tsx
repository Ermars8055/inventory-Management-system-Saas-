import React, { useState, useEffect, useMemo, useRef } from 'react';
import { COUNTRIES, CountryPhoneSpec, DEFAULT_COUNTRY, parsePhoneNumber } from '@/data/countries';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Search, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CountryPhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  defaultCountryCode?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

export function CountryPhoneInput({
  value = '',
  onChange,
  defaultCountryCode = 'IN',
  placeholder,
  disabled = false,
  required = false,
  className,
  id,
}: CountryPhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Parse initial or incoming value
  const parsed = useMemo(() => {
    return parsePhoneNumber(value, defaultCountryCode);
  }, [value, defaultCountryCode]);

  const [selectedCountry, setSelectedCountry] = useState<CountryPhoneSpec>(parsed.country);
  const [nationalNumber, setNationalNumber] = useState<string>(parsed.nationalNumber);

  // Sync internal state when external value changes
  useEffect(() => {
    const p = parsePhoneNumber(value, defaultCountryCode);
    setSelectedCountry(p.country);
    setNationalNumber(p.nationalNumber);
  }, [value, defaultCountryCode]);

  // Filtered country list
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase().trim();
    return COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  // Handle number change
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const digitsOnly = e.target.value.replace(/\D/g, '');
    const limitedDigits = digitsOnly.slice(0, selectedCountry.digits);
    setNationalNumber(limitedDigits);

    if (limitedDigits.length > 0) {
      onChange(`${selectedCountry.dialCode} ${limitedDigits}`);
    } else {
      onChange('');
    }
  };

  // Handle country change
  const handleCountrySelect = (country: CountryPhoneSpec) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch('');
    // Re-truncate national number if new country allows fewer digits
    const reTruncated = nationalNumber.slice(0, country.digits);
    setNationalNumber(reTruncated);

    if (reTruncated.length > 0) {
      onChange(`${country.dialCode} ${reTruncated}`);
    } else {
      onChange('');
    }
  };

  const isFull = nationalNumber.length === selectedCountry.digits;

  return (
    <div className={cn('flex items-center gap-1.5 w-full relative', className)}>
      {/* Country Code Trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-9 items-center justify-between gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-ring shrink-0 transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="font-mono font-medium text-xs text-foreground">{selectedCountry.dialCode}</span>
            <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[280px] p-0 shadow-lg border rounded-lg overflow-hidden" align="start">
          {/* Search box */}
          <div className="flex items-center border-b px-2.5 py-1.5 bg-muted/30">
            <Search className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
            <input
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              placeholder="Search country or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* List of countries */}
          <div className="max-h-[220px] overflow-y-auto p-1 divide-y divide-border/20">
            {filteredCountries.map(c => {
              const isSelected = selectedCountry.code === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors text-left',
                    isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/70 text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{c.dialCode}</span>
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                  </div>
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching country
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* National Number Input */}
      <div className="relative flex-1">
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          required={required}
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder={placeholder || selectedCountry.placeholder}
          maxLength={selectedCountry.digits}
          className={cn(
            'h-9 text-xs font-mono pr-14 tracking-wide',
            isFull && 'border-emerald-500/50 focus-visible:ring-emerald-500/30'
          )}
        />
        {/* Dynamic Digit Counter Badge */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <span
            className={cn(
              'text-[10px] font-mono px-1 py-0.5 rounded transition-colors',
              nationalNumber.length === 0
                ? 'text-muted-foreground/60'
                : isFull
                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 font-semibold'
                : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
            )}
          >
            {nationalNumber.length}/{selectedCountry.digits}
          </span>
        </div>
      </div>
    </div>
  );
}

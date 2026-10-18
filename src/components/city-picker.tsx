import { useMemo, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { cities } from "@/lib/marketplace";

type CityPickerProps = {
  value: string;
  onChange: (city: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  options?: readonly string[];
};

export function CityPicker({ value, onChange, id, placeholder = "جست‌وجوی شهر یا استان…", disabled = false, options = cities }: CityPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fa");
    if (!q) return options;
    return options.filter(city => city.toLocaleLowerCase("fa").includes(q));
  }, [query, options]);

  return (
    <div className="relative">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          dir="rtl"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-options` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={open ? query : value}
          onFocus={() => { setQuery(""); setOpen(true); }}
          onChange={event => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={event => {
            if (event.key === "Escape") { setOpen(false); setQuery(""); }
            if (event.key === "Enter" && filtered.length === 1) {
              event.preventDefault();
              onChange(filtered[0]);
              setOpen(false);
              setQuery("");
            }
          }}
          className="field-input pr-9 text-base font-semibold leading-7 text-foreground placeholder:font-normal placeholder:text-muted-foreground"
          placeholder={placeholder}
        />
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open && !disabled && (
        <>
          <button type="button" aria-label="بستن فهرست شهرها" className="fixed inset-0 z-10 cursor-default" onClick={() => { setOpen(false); setQuery(""); }} />
          <div id={id ? `${id}-options` : undefined} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-1 text-foreground shadow-xl">
            <p className="px-3 py-2 text-sm font-medium text-muted-foreground">{filtered.length ? `${filtered.length} شهر در فهرست` : "شهری پیدا نشد"}</p>
            {filtered.map(city => (
              <button
                type="button"
                role="option"
                aria-selected={city === value}
                key={city}
                onPointerDown={event => event.preventDefault()}
                onClick={() => { onChange(city); setQuery(""); setOpen(false); }}
                className="flex w-full items-center justify-between rounded-md px-3 py-3 text-right text-base font-medium leading-7 text-foreground hover:bg-accent focus-visible:bg-accent"
              >
                <span>{city}</span>
                {city === value && <Check aria-hidden="true" className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { cities } from "@/lib/marketplace";

type CityPickerProps = {
  value: string;
  onChange: (city: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function CityPicker({ value, onChange, id, placeholder = "جست‌وجوی شهر یا استان…", disabled = false }: CityPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fa");
    if (!q) return cities;
    return cities.filter(city => city.toLocaleLowerCase("fa").includes(q));
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
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
          className="field-input pr-9"
          placeholder={value || placeholder}
        />
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open && !disabled && (
        <>
          <button type="button" aria-label="بستن فهرست شهرها" className="fixed inset-0 z-10 cursor-default" onClick={() => { setOpen(false); setQuery(""); }} />
          <div id={id ? `${id}-options` : undefined} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
            <p className="px-3 py-2 text-xs text-muted-foreground">{filtered.length ? `${filtered.length} شهر در فهرست` : "شهری پیدا نشد"}</p>
            {filtered.map(city => (
              <button
                type="button"
                role="option"
                aria-selected={city === value}
                key={city}
                onClick={() => { onChange(city); setOpen(false); setQuery(""); }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-right text-sm hover:bg-accent focus-visible:bg-accent"
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

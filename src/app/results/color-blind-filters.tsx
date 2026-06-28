export function ColorBlindFilters() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute h-0 w-0 overflow-hidden">
      <defs>
        <filter id="cb-deut">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0 0 0  0.70 0.30 0 0 0  0 0.30 0.70 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="cb-prot">
          <feColorMatrix
            type="matrix"
            values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="cb-trit">
          <feColorMatrix
            type="matrix"
            values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}

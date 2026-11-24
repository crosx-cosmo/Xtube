export interface DropdownKeyOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Computes the next highlighted option index for keyboard navigation inside
 * a custom listbox dropdown (`ArrowDown`, `ArrowUp`, `Home`, `End`).
 */
export function getNextDropdownIndex(
  currentIndex: number,
  key: string,
  totalItems: number
): number {
  if (totalItems <= 0) return -1;

  const clampedCurrent =
    currentIndex < 0 || currentIndex >= totalItems ? 0 : currentIndex;

  switch (key) {
    case 'ArrowDown':
      return (clampedCurrent + 1) % totalItems;
    case 'ArrowUp':
      return (clampedCurrent - 1 + totalItems) % totalItems;
    case 'Home':
      return 0;
    case 'End':
      return totalItems - 1;
    default:
      return clampedCurrent;
  }
}

/**
 * Finds the index of the currently selected option value, falling back to 0
 * when options are present so keyboard navigation always starts predictably.
 */
export function findSelectedOptionIndex<T extends string>(
  options: readonly DropdownKeyOption<T>[],
  selectedValue: T
): number {
  if (options.length === 0) return -1;
  const match = options.findIndex((opt) => opt.value === selectedValue);
  return match >= 0 ? match : 0;
}

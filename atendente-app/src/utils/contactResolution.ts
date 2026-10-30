import type { ContactMatch } from "../types";

export function resolveContactMatches(contacts: ContactMatch[]) {
  const matches = Array.isArray(contacts) ? contacts : [];
  return {
    selected: matches.length === 1 ? matches[0] : null,
    requiresSelection: matches.length > 1,
    hasMatches: matches.length > 0,
  };
}

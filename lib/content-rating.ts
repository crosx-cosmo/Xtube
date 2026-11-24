/**
 * Pure 18+ Content Rating & RTA Transparency resolver.
 * Zero DOM dependencies — directly unit-testable with node:test.
 */

export type ContentRatingCode = '18+' | 'RTA-18+' | '21+' | 'MATURE';

export const RTA_COMPLIANCE_CODE = 'RTA-5042-1996-1400-1577-RTA';

export interface ContentRatingInfo {
  code: ContentRatingCode;
  compactLabel: string;
  headerLabel: string;
  rtaCode: string;
  advisoryTitle: string;
  advisoryText: string;
  ariaLabel: string;
  minAge: number;
}

const RATING_DEFINITIONS: Record<ContentRatingCode, ContentRatingInfo> = {
  '18+': {
    code: '18+',
    compactLabel: '18+',
    headerLabel: '18+ Adults Only',
    rtaCode: RTA_COMPLIANCE_CODE,
    advisoryTitle: '18+ Adult Content Rating',
    advisoryText:
      'Restricted strictly to consenting adults aged 18 or older. Tagged under the RTA (Restricted To Adults) parental-control transparency standard.',
    ariaLabel: 'Content rating: 18+ Adults Only, RTA compliant',
    minAge: 18,
  },
  'RTA-18+': {
    code: 'RTA-18+',
    compactLabel: '18+ RTA',
    headerLabel: '18+ RTA Verified',
    rtaCode: RTA_COMPLIANCE_CODE,
    advisoryTitle: '18+ RTA Verified Adult Content',
    advisoryText:
      'Explicit adult entertainment restricted to viewers aged 18+ with active RTA-5042-1996-1400-1577-RTA parental filtering metadata.',
    ariaLabel: 'Content rating: 18+ RTA Verified Adults Only',
    minAge: 18,
  },
  '21+': {
    code: '21+',
    compactLabel: '21+',
    headerLabel: '21+ Adults Only',
    rtaCode: RTA_COMPLIANCE_CODE,
    advisoryTitle: '21+ Adult Content Rating',
    advisoryText:
      'Restricted strictly to verified adults aged 21 or older in applicable jurisdictions. Labeled under the RTA parental-control transparency standard.',
    ariaLabel: 'Content rating: 21+ Adults Only, RTA compliant',
    minAge: 21,
  },
  MATURE: {
    code: 'MATURE',
    compactLabel: '18+ M',
    headerLabel: '18+ Mature',
    rtaCode: RTA_COMPLIANCE_CODE,
    advisoryTitle: '18+ Mature Content Rating',
    advisoryText:
      'Intended strictly for adult audiences aged 18 or older. Labeled under the RTA parental-control transparency standard.',
    ariaLabel: 'Content rating: 18+ Mature Audience, RTA compliant',
    minAge: 18,
  },
};

const ALIAS_MAP: Record<string, ContentRatingCode> = {
  '18+': '18+',
  '18': '18+',
  ADULT: '18+',
  ADULTS: '18+',
  'ADULTS ONLY': '18+',
  'NC-17': '18+',
  NC17: '18+',
  XXX: '18+',
  'RTA-18+': 'RTA-18+',
  '18+ RTA': 'RTA-18+',
  RTA: 'RTA-18+',
  '21+': '21+',
  '21': '21+',
  MATURE: 'MATURE',
  '18+ M': 'MATURE',
  M: 'MATURE',
};

/**
 * Checks whether a raw rating value matches a known 18+ content rating code or alias.
 */
export function isValidContentRating(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, ' ');
  return Object.prototype.hasOwnProperty.call(ALIAS_MAP, normalized);
}

/**
 * Resolves any rating string into a standardized 18+ ContentRatingInfo object.
 * Always defaults safely to '18+' so adult transparency compliance is guaranteed.
 */
export function resolveContentRating(
  rating?: string | null
): ContentRatingInfo {
  if (!rating || typeof rating !== 'string') {
    return RATING_DEFINITIONS['18+'];
  }
  const normalized = rating.trim().toUpperCase().replace(/\s+/g, ' ');
  const resolvedCode = ALIAS_MAP[normalized] ?? '18+';
  return RATING_DEFINITIONS[resolvedCode];
}

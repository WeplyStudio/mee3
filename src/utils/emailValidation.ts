/**
 * Comprehensive Email Validator
 * Checks:
 * 1. Syntax structure (RFC 5322 compliance)
 * 2. Valid ICANN Top-Level Domain (TLD)
 * 3. Domain label format and gibberish checks
 */

// Set of valid ICANN ccTLDs (2-letter country codes) and popular gTLDs
const VALID_TLDS = new Set([
  // Generic & Sponsored TLDs
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro', 'museum', 'coop', 'aero',
  // Popular Modern gTLDs
  'app', 'dev', 'tech', 'site', 'online', 'store', 'shop', 'xyz', 'design', 'studio', 'cloud', 'global',
  'io', 'ai', 'blog', 'agency', 'space', 'work', 'world', 'life', 'today', 'digital', 'media', 'press',
  'email', 'link', 'live', 'news', 'solutions', 'systems', 'zone', 'group', 'team', 'network', 'one',
  'page', 'run', 'fun', 'icu', 'top', 'vip', 'win', 'asia', 'club', 'events', 'expert', 'foundation',
  'guru', 'house', 'ink', 'land', 'law', 'ltd', 'marketing', 'ninja', 'photography', 'plus', 'pub',
  'services', 'software', 'support', 'town', 'ventures', 'website', 'art', 'fit', 'biz', 'cat', 'jobs',
  'mobi', 'tel', 'travel', 'berlin', 'london', 'nyc', 'tokyo', 'academy', 'center', 'company', 'consulting',
  'directory', 'education', 'estate', 'finance', 'gallery', 'health', 'institute', 'international', 'management',
  'marketing', 'online', 'services', 'technology', 'solutions', 'university',

  // 2-letter Country Code TLDs (ccTLDs)
  'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
  'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt', 'bv', 'bw',
  'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv',
  'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'er', 'es', 'et', 'eu',
  'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn',
  'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il',
  'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn',
  'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma',
  'mc', 'md', 'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv',
  'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om',
  'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro',
  'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so',
  'sr', 'ss', 'st', 'su', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm',
  'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'uk', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg',
  'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw'
]);

export interface EmailValidationResult {
  isValid: boolean;
  errorReason?: string;
}

export function validateEmail(email: string, lang: 'id' | 'en' | 'de' | 'ja' = 'en'): EmailValidationResult {
  const trimmed = email.trim();

  // Basic empty check
  if (!trimmed) {
    return {
      isValid: false,
      errorReason: lang === 'id' ? 'Email wajib diisi.' : 'Email address is required.',
    };
  }

  const genericInvalidMsg =
    lang === 'id'
      ? 'Email tidak valid.'
      : lang === 'de'
      ? 'Ungültige E-Mail-Adresse.'
      : lang === 'ja'
      ? '無効なメールアドレスです。'
      : 'Invalid email address.';

  // Length check
  if (trimmed.length < 5 || trimmed.length > 254) {
    return {
      isValid: false,
      errorReason: genericInvalidMsg,
    };
  }

  // Exactly one '@' symbol
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      errorReason: genericInvalidMsg,
    };
  }

  const [username, domain] = parts;

  // Username validation
  if (!username || username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
    return {
      isValid: false,
      errorReason: genericInvalidMsg,
    };
  }

  const usernameRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!usernameRegex.test(username)) {
    return {
      isValid: false,
      errorReason: genericInvalidMsg,
    };
  }

  // Domain validation
  if (!domain || !domain.includes('.')) {
    return {
      isValid: false,
      errorReason: genericInvalidMsg,
    };
  }

  const domainParts = domain.toLowerCase().split('.');
  
  // Every label in domain must be valid
  for (const part of domainParts) {
    if (!part || part.startsWith('-') || part.endsWith('-')) {
      return {
        isValid: false,
        errorReason: genericInvalidMsg,
      };
    }
    if (!/^[a-z0-9-]+$/.test(part)) {
      return {
        isValid: false,
        errorReason: genericInvalidMsg,
      };
    }
  }

  // TLD validation
  const tld = domainParts[domainParts.length - 1];
  if (!VALID_TLDS.has(tld)) {
    return {
      isValid: false,
      errorReason: genericInvalidMsg,
    };
  }

  // Domain main name check (prevent obvious vowel-less gibberish like "gdgdggd" or "asdfghjk")
  const mainDomain = domainParts[0];
  if (mainDomain.length > 5 && !/[aeiouy0-9]/i.test(mainDomain)) {
    return {
      isValid: false,
      errorReason: genericInvalidMsg,
    };
  }

  return { isValid: true };
}

export function getFormStatusText(
  hasName: boolean,
  hasMessage: boolean,
  hasEmail: boolean,
  isEmailValid: boolean,
  isCaptchaValid: boolean,
  rawEmail: string,
  lang: 'id' | 'en' | 'de' | 'ja' = 'en'
): string {
  if (hasEmail) {
    const trimmed = rawEmail.trim();
    if (!trimmed.includes('@') || trimmed.split('@').length !== 2 || !trimmed.includes('.')) {
      return lang === 'id'
        ? 'saya tidak bisa membalas pesan ke situ'
        : 'i can\'t reply to that address';
    }
    if (!isEmailValid) {
      return lang === 'id'
        ? 'anda yakin itu alamat yang benar??'
        : 'are you sure that\'s the right address??';
    }
  }

  if (!hasName || !hasMessage || !hasEmail || !isCaptchaValid) {
    return lang === 'id'
      ? 'ada sesuatu yang hilang'
      : 'something is missing';
  }

  return '';
}

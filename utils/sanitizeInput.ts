/**
 * Kullanıcı girişini temizleyerek XSS ve diğer zararlı kodlama tehditlerini önler
 */
const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  if (input.length > 100) {
    input = input.slice(0, 100);
  }

  const sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  const noScriptInjection = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '');

  const noSqlInjection = noScriptInjection
    .replace(/(\b(select|insert|update|delete|drop|alter|exec|union)\b)/gi, '')
    .replace(/--/g, '')
    .replace(/;/g, '');

  return noSqlInjection
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
};

/**
 * Arama sorguları için optimize edilmiş sanitizasyon
 */
const sanitizeSearchQuery = (searchQuery: string): string => {
  if (!searchQuery || typeof searchQuery !== 'string') return '';

  if (searchQuery.length > 100) {
    searchQuery = searchQuery.slice(0, 100);
  }

  const sanitized = searchQuery
    .replace(/[<>]/g, '')
    .replace(/script/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  return sanitized.trimStart();
};

export { sanitizeInput, sanitizeSearchQuery };

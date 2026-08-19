/** ISO → regional-indicator flag emoji (e.g. GH → 🇬🇭). */
export function flagEmojiFromIso(iso: string): string {
  const code = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🌍';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
}

/** Best-effort flag for a country display name. */
export function countryFlagEmoji(countryName: string): string {
  const name = countryName.trim().toLowerCase();
  if (!name || name === 'all countries') return '🌍';

  const aliases: Record<string, string> = {
    ghana: 'GH',
    nigeria: 'NG',
    kenya: 'KE',
    'south africa': 'ZA',
    'united kingdom': 'GB',
    uk: 'GB',
    'united states': 'US',
    usa: 'US',
    canada: 'CA',
    france: 'FR',
    germany: 'DE',
    india: 'IN',
  };
  const iso = aliases[name];
  return iso ? flagEmojiFromIso(iso) : '🌍';
}

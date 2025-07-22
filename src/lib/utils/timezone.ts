/**
 * Timezone utilities for user-specific date calculations
 */

/**
 * Get the current date in the user's timezone
 * @param userTimezone - IANA timezone string (e.g., "America/New_York", "Europe/London")
 * @returns Date string in YYYY-MM-DD format for the user's local date
 */
export function getUserLocalDate(userTimezone: string = "UTC"): string {
  try {
    // Create a date formatter for the user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    // Format current date in user's timezone
    // en-CA locale gives us YYYY-MM-DD format directly
    return formatter.format(new Date());
  } catch (error) {
    // If timezone is invalid, fall back to UTC
    console.warn(`Invalid timezone "${userTimezone}", falling back to UTC`);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get the user's timezone from their browser
 * This should be called client-side
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Get the current date in the browser's timezone
 * This should be called client-side
 */
export function getBrowserLocalDate(): string {
  const timezone = getBrowserTimezone();
  return getUserLocalDate(timezone);
}

/**
 * List of common timezones for a dropdown
 */
export const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  // Americas
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Buenos_Aires", label: "Buenos Aires" },
  // Europe
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Rome", label: "Rome" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Europe/Stockholm", label: "Stockholm" },
  { value: "Europe/Oslo", label: "Oslo" },
  { value: "Europe/Moscow", label: "Moscow" },
  // Asia
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Jerusalem", label: "Jerusalem" },
  { value: "Asia/Mumbai", label: "Mumbai" },
  { value: "Asia/Kolkata", label: "Kolkata" },
  { value: "Asia/Bangkok", label: "Bangkok" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Seoul", label: "Seoul" },
  // Oceania
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Melbourne", label: "Melbourne" },
  { value: "Australia/Brisbane", label: "Brisbane" },
  { value: "Australia/Perth", label: "Perth" },
  { value: "Pacific/Auckland", label: "Auckland" },
  // Africa
  { value: "Africa/Cairo", label: "Cairo" },
  { value: "Africa/Johannesburg", label: "Johannesburg" },
  { value: "Africa/Lagos", label: "Lagos" },
];
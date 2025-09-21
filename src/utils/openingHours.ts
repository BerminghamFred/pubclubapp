/**
 * Utility functions for parsing opening hours and checking if pubs are currently open
 */

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

/**
 * Parse opening hours string into structured data
 * @param openingHoursString - String like "Monday: 12:00 – 10:00 PM;Tuesday: 12:00 – 10:00 PM;..."
 * @returns Array of OpeningHours objects
 */
export function parseOpeningHours(openingHoursString: string): OpeningHours[] {
  if (!openingHoursString) return [];

  const hours: OpeningHours[] = [];
  
  // Split by semicolon to get individual days
  const dayEntries = openingHoursString.split(';');
  
  for (const entry of dayEntries) {
    if (!entry.trim()) continue;
    
    // Match pattern: "Monday: 12:00 – 10:00 PM"
    const match = entry.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    
    const day = match[1].trim();
    const timeRange = match[2].trim();
    
    // Parse time range: "12:00 – 10:00 PM"
    const timeMatch = timeRange.match(/^(.+?)\s*–\s*(.+)$/);
    if (!timeMatch) continue;
    
    const openTime = timeMatch[1].trim();
    const closeTime = timeMatch[2].trim();
    
    hours.push({
      day,
      open: openTime,
      close: closeTime,
      isOpen: false // Will be calculated later
    });
  }
  
  return hours;
}

/**
 * Convert time string to minutes since midnight
 * @param timeString - Time string like "12:00 PM", "10:00 PM", "12:00", etc.
 * @returns Minutes since midnight
 */
function timeStringToMinutes(timeString: string): number {
  // Remove any extra spaces and normalize
  let time = timeString.trim().toUpperCase();
  
  // Handle different formats
  let isPM = false;
  let isAM = false;
  
  if (time.includes('PM')) {
    isPM = true;
    time = time.replace('PM', '').trim();
  } else if (time.includes('AM')) {
    isAM = true;
    time = time.replace('AM', '').trim();
  }
  
  // Parse hours and minutes
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr || '0', 10);
  
  // Handle 12-hour format
  if (isPM && hours !== 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  
  // Handle 24-hour format (if no AM/PM specified)
  if (!isPM && !isAM) {
    // Assume 24-hour format if hours > 12 or if it's a reasonable time
    if (hours > 12 || (hours === 12 && minutes === 0)) {
      // This might be 24-hour format, keep as is
    } else {
      // This might be 12-hour format without AM/PM, assume PM if reasonable
      if (hours >= 8 && hours <= 11) {
        hours += 12;
      }
    }
  }
  
  return hours * 60 + minutes;
}

/**
 * Get current UK time in minutes since midnight
 * @returns Minutes since midnight in UK time
 */
function getCurrentUKTimeInMinutes(): number {
  const now = new Date();
  
  // Convert to UK time (GMT/BST)
  const ukTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
  
  const hours = ukTime.getHours();
  const minutes = ukTime.getMinutes();
  
  return hours * 60 + minutes;
}

/**
 * Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @returns Day of week number
 */
function getCurrentUKDayOfWeek(): number {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
  return ukTime.getDay();
}

/**
 * Map day names to day numbers (0 = Sunday)
 */
const DAY_NAME_TO_NUMBER: { [key: string]: number } = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

/**
 * Check if a pub is currently open based on opening hours
 * @param openingHoursString - Opening hours string from pub data
 * @returns true if pub is currently open, false otherwise
 */
export function isPubOpenNow(openingHoursString: string): boolean {
  if (!openingHoursString) return false;
  
  const openingHours = parseOpeningHours(openingHoursString);
  if (openingHours.length === 0) return false;
  
  const currentDay = getCurrentUKDayOfWeek();
  const currentTime = getCurrentUKTimeInMinutes();
  
  // Find today's opening hours
  const todayHours = openingHours.find(hours => {
    const dayNumber = DAY_NAME_TO_NUMBER[hours.day];
    return dayNumber === currentDay;
  });
  
  if (!todayHours) return false;
  
  try {
    const openTime = timeStringToMinutes(todayHours.open);
    const closeTime = timeStringToMinutes(todayHours.close);
    
    // Handle pubs that close after midnight (e.g., close at 2 AM next day)
    if (closeTime < openTime) {
      // Pub closes the next day
      return currentTime >= openTime || currentTime < closeTime;
    } else {
      // Normal case: opens and closes same day
      return currentTime >= openTime && currentTime < closeTime;
    }
  } catch (error) {
    console.warn(`Error parsing opening hours for: ${openingHoursString}`, error);
    return false;
  }
}

/**
 * Get human-readable current UK time
 * @returns String like "2:30 PM" in UK time
 */
export function getCurrentUKTimeString(): string {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
  
  return ukTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/London'
  });
}

/**
 * Get current UK day name
 * @returns String like "Monday"
 */
export function getCurrentUKDayName(): string {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
  
  return ukTime.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'Europe/London'
  });
}

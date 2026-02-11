import { toDate } from "./timestamps";
import type { Event } from "@/types/event";

export type EventStatus = "upcoming" | "ongoing" | "past";

/**
 * Determines the status of an event based on its start and end dates
 * @param event - The event to check
 * @param now - The current date/time (defaults to current date)
 * @returns "upcoming", "ongoing", or "past"
 */
export function getEventStatus(event: Event, now: Date = new Date()): EventStatus {
  const startDate = toDate(event.startDate);
  const endDate = toDate(event.endDate);

  // If dates can't be parsed, default to upcoming
  if (!startDate || !endDate) return "upcoming";

  // Check if event hasn't started yet
  if (now < startDate) return "upcoming";

  // Check if event is currently happening (now is between start and end, inclusive)
  if (now >= startDate && now <= endDate) return "ongoing";

  // Otherwise, event has ended
  return "past";
}

/**
 * Checks if an event is currently active (isActive flag is true AND event is ongoing)
 * @param event - The event to check
 * @param now - The current date/time (defaults to current date)
 * @returns true if the event is active and ongoing, false otherwise
 */
export function isEventActive(event: Event, now: Date = new Date()): boolean {
  return event.isActive && getEventStatus(event, now) === "ongoing";
}

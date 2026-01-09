// src/services/drivestatusscheduler.ts
import { Timestamp } from "firebase/firestore";
import { parse } from "date-fns";
import { getAllDrives, updateDriveStatus } from "./drives";
import { Drive, DriveRound } from "../models/drives";

/**
 * Parse a date value that could be a string, Timestamp, or Date
 */
function parseDate(dateValue: unknown): Date | null {
  if (!dateValue) return null;

  // If it's already a Date
  if (dateValue instanceof Date) {
    return dateValue;
  }

  // If it's a Firestore Timestamp
  if (dateValue instanceof Timestamp) {
    return dateValue.toDate();
  }

  // If it's an object with toDate method (Firestore Timestamp in some contexts)
  if (
    typeof dateValue === "object" &&
    "toDate" in dateValue &&
    typeof (dateValue as { toDate: () => Date }).toDate === "function"
  ) {
    return (dateValue as { toDate: () => Date }).toDate();
  }

  // If it's a string, try to parse it
  if (typeof dateValue === "string") {
    // Try common date formats
    const formats = [
      "MMM dd, yyyy", // "Jan 15, 2024"
      "MMM d, yyyy", // "Jan 5, 2024"
      "yyyy-MM-dd", // ISO format
      "dd/MM/yyyy", // "15/01/2024"
      "MM/dd/yyyy", // "01/15/2024"
    ];

    for (const format of formats) {
      try {
        const parsed = parse(dateValue, format, new Date());
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch {
        // Try next format
      }
    }

    // Try ISO string parsing
    const isoDate = new Date(dateValue);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }

  return null;
}

/**
 * Check if a drive has any rounds defined
 * Exported for use in UI components
 */
export function hasRounds(drive: Drive): boolean {
  // Check rounds in roles
  for (const role of drive.roles || []) {
    if (role.rounds && role.rounds.length > 0) {
      return true;
    }
  }

  // Check drive-level rounds
  if (drive.rounds && drive.rounds.length > 0) {
    return true;
  }

  return false;
}

/**
 * Get the earliest (first) round date from all roles in a drive
 */
function getFirstRoundDate(drive: Drive): Date | null {
  let firstDate: Date | null = null;

  // Check rounds in each role
  for (const role of drive.roles || []) {
    if (role.rounds && role.rounds.length > 0) {
      for (const round of role.rounds) {
        const roundDate = parseDate(round.dateTime);
        if (roundDate) {
          if (!firstDate || roundDate < firstDate) {
            firstDate = roundDate;
          }
        }
      }
    }
  }

  // Also check drive-level rounds (if any)
  if (drive.rounds && drive.rounds.length > 0) {
    for (const round of drive.rounds) {
      const roundDate = parseDate(round.dateTime);
      if (roundDate) {
        if (!firstDate || roundDate < firstDate) {
          firstDate = roundDate;
        }
      }
    }
  }

  return firstDate;
}

/**
 * Get the latest (last) round date from all roles in a drive
 */
function getLastRoundDate(drive: Drive): Date | null {
  let lastDate: Date | null = null;

  // Check rounds in each role
  for (const role of drive.roles || []) {
    if (role.rounds && role.rounds.length > 0) {
      for (const round of role.rounds) {
        const roundDate = parseDate(round.dateTime);
        if (roundDate) {
          if (!lastDate || roundDate > lastDate) {
            lastDate = roundDate;
          }
        }
      }
    }
  }

  // Also check drive-level rounds (if any)
  if (drive.rounds && drive.rounds.length > 0) {
    for (const round of drive.rounds) {
      const roundDate = parseDate(round.dateTime);
      if (roundDate) {
        if (!lastDate || roundDate > lastDate) {
          lastDate = roundDate;
        }
      }
    }
  }

  return lastDate;
}

/**
 * Determine if a drive should be active based on first round date
 * Drive becomes active when the first round date arrives
 */
function shouldBeActive(drive: Drive, now: Date): boolean {
  const firstRound = getFirstRoundDate(drive);
  
  // Drive becomes active when the first round date has arrived (today or past)
  if (firstRound && firstRound <= now) {
    return true;
  }

  return false;
}

/**
 * Determine if a drive should be closed based on last round date
 * Drive becomes closed when the last round date has passed
 */
function shouldBeClosed(drive: Drive, now: Date): boolean {
  const lastRound = getLastRoundDate(drive);
  
  // Drive becomes closed when the last round date has passed
  if (lastRound && lastRound < now) {
    return true;
  }

  return false;
}

/**
 * Update the status of a single drive based on current dates
 * Only updates automatically if the drive has rounds defined
 * If no rounds, admin must manually change status
 */
async function updateDriveStatusIfNeeded(
  drive: Drive,
  now: Date = new Date()
): Promise<{ changed: boolean; newStatus?: string; skipped?: boolean }> {
  try {
    // Only auto-update if drive has rounds defined
    if (!hasRounds(drive)) {
      // Skip drives without rounds - admin must manually change status
      return { changed: false, skipped: true };
    }

    if (drive.status === "upcoming") {
      // Check if first round date has arrived
      if (shouldBeActive(drive, now)) {
        await updateDriveStatus(drive.id, "active");
        const companyName = (drive as any).company || drive.companyName || "Unknown";
        console.log(`Drive ${drive.id} (${companyName}) updated: upcoming → active (first round started)`);
        return { changed: true, newStatus: "active" };
      }
    } else if (drive.status === "active") {
      // Check if last round date has passed
      if (shouldBeClosed(drive, now)) {
        await updateDriveStatus(drive.id, "closed");
        const companyName = (drive as any).company || drive.companyName || "Unknown";
        console.log(`Drive ${drive.id} (${companyName}) updated: active → closed (last round completed)`);
        return { changed: true, newStatus: "closed" };
      }
    }
    // If status is "closed", no changes needed
  } catch (error) {
    console.error(`Error updating drive ${drive.id}:`, error);
    throw error;
  }

  return { changed: false };
}

/**
 * Main scheduler function: Updates statuses for all drives
 * Only updates drives that have rounds defined
 * Drives without rounds are skipped (admin must manually change status)
 * This should be called periodically (e.g., daily via cron job or scheduled function)
 */
export async function updateAllDriveStatuses(): Promise<{
  updated: number;
  errors: number;
  skipped: number;
  details: Array<{ driveId: string; companyName: string; oldStatus: string; newStatus: string }>;
}> {
  const now = new Date();
  const results = {
    updated: 0,
    errors: 0,
    skipped: 0,
    details: [] as Array<{ driveId: string; companyName: string; oldStatus: string; newStatus: string }>,
  };

  try {
    console.log(`[Drive Status Scheduler] Starting status update at ${now.toISOString()}`);

    // Get all drives (excluding closed ones for efficiency, but we'll check all to be safe)
    const drives = await getAllDrives();

    console.log(`[Drive Status Scheduler] Found ${drives.length} drives to check`);

    // Process each drive
    for (const drive of drives) {
      // Skip if already closed
      if (drive.status === "closed") {
        continue;
      }

      const oldStatus = drive.status;

      try {
        const { changed, newStatus, skipped } = await updateDriveStatusIfNeeded(drive, now);
        
        if (skipped) {
          results.skipped++;
        } else if (changed && newStatus) {
          results.updated++;
          const companyName = (drive as any).company || drive.companyName || "Unknown";
          results.details.push({
            driveId: drive.id,
            companyName,
            oldStatus,
            newStatus,
          });
        }
      } catch (error) {
        results.errors++;
        console.error(`[Drive Status Scheduler] Error processing drive ${drive.id}:`, error);
      }
    }

    console.log(
      `[Drive Status Scheduler] Completed: ${results.updated} updated, ${results.skipped} skipped (no rounds), ${results.errors} errors`
    );

    return results;
  } catch (error) {
    console.error("[Drive Status Scheduler] Fatal error:", error);
    throw error;
  }
}

/**
 * Initialize a periodic scheduler (for client-side use)
 * Note: For production, use Firebase Cloud Functions with scheduled triggers
 */
export function startPeriodicStatusUpdate(
  intervalMinutes: number = 60,
  onUpdate?: (results: Awaited<ReturnType<typeof updateAllDriveStatuses>>) => void
): () => void {
  console.log(`[Drive Status Scheduler] Starting periodic updates every ${intervalMinutes} minutes`);

  // Run immediately
  updateAllDriveStatuses()
    .then((results) => {
      if (onUpdate) onUpdate(results);
    })
    .catch((error) => {
      console.error("[Drive Status Scheduler] Initial update failed:", error);
    });

  // Set up interval
  const intervalId = setInterval(() => {
    updateAllDriveStatuses()
      .then((results) => {
        if (onUpdate) onUpdate(results);
      })
      .catch((error) => {
        console.error("[Drive Status Scheduler] Periodic update failed:", error);
      });
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log("[Drive Status Scheduler] Stopped periodic updates");
  };
}


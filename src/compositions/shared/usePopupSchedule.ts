import { useMemo } from 'react';
import { useVideoConfig } from 'remotion';

interface ScheduleConfig {
    /** 
     * Target cycle time in seconds. 
     * e.g. 120 means we WANT it to appear roughly once every 2 minutes.
     */
    cycleSeconds: number;
    
    /** 
     * How long the popup takes to fully animate (in seconds).
     * The hook ensures no popup starts if it can't finish before the video ends.
     */
    animationDurationSeconds: number;

    /**
     * Optional offset for the very first appearance.
     * Starts the calculation delayed by this many seconds.
     */
    offsetSeconds?: number;

    /**
     * Do not show any popups in the first N seconds of the video.
     */
    safeZoneStartSeconds?: number;

    /**
     * Do not show any popups in the last N seconds of the video.
     */
    safeZoneEndSeconds?: number;
}

/**
 * Calculates a fixed array of starting frames for a popup so it:
 * 1. Never gets cut off at the end of the video.
 * 2. Is evenly distributed across the available time.
 * 3. Respects safe zones at the start and end of the track.
 */
export function usePopupSchedule({
    cycleSeconds,
    animationDurationSeconds,
    offsetSeconds = 0,
    safeZoneStartSeconds = 5,
    safeZoneEndSeconds = 10
}: ScheduleConfig): number[] {
    const { fps, durationInFrames } = useVideoConfig();

    return useMemo(() => {
        const totalDurationSecs = durationInFrames / fps;
        
        // 1. Calculate the absolute bounds where a popup is ALLOWED to START.
        // It cannot start before safeZoneStart.
        // It cannot start if it would end after (totalDurationSecs - safeZoneEnd).
        const allowedStartWindowBegin = safeZoneStartSeconds;
        const allowedStartWindowEnd = totalDurationSecs - safeZoneEndSeconds - animationDurationSeconds;

        const schedule: number[] = [];

        // If the video is so short that we don't even have room for one animation,
        // or the offset pushes it out of bounds immediately, return empty.
        if (allowedStartWindowEnd < allowedStartWindowBegin) {
            return schedule;
        }

        // 2. We simulate the old `cycleSeconds` behavior, but strictly bounded.
        let currentTargetSec = offsetSeconds;
        
        // If offset is 0, we might want it to start immediately at `safeZoneStart` 
        // if `safeZoneStart` > 0. Let's ensure the first target isn't less than the safe zone.
        if (currentTargetSec < allowedStartWindowBegin) {
             // For uniform distribution, if they asked for offset 0, we just push 
             // the first occurrence to the beginning of the safe window.
             currentTargetSec = allowedStartWindowBegin;
        }

        // Generate timestamps
        while (currentTargetSec <= allowedStartWindowEnd) {
            schedule.push(currentTargetSec * fps);
            currentTargetSec += cycleSeconds;
        }

        return schedule;
    }, [fps, durationInFrames, cycleSeconds, animationDurationSeconds, offsetSeconds, safeZoneStartSeconds, safeZoneEndSeconds]);
}

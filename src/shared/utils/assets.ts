import { staticFile } from 'remotion';

/**
 * Resolve a public/ asset by its path relative to public/.
 * Examples:
 *   asset('audio/track.mp3')
 *   asset('graphics/soldier_4.svg')
 *   asset('icons/spotify.svg')
 *   asset('images/boy_1.jpg')
 */
export const asset = (path: string): string => staticFile(path);

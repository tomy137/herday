// SPDX-License-Identifier: AGPL-3.0-or-later
import { Fragment } from 'react';

interface PostureRailProps {
  /** The 3–5 posture words for the current phase (already localized). */
  words: string[];
  /** Optional ink colour override (e.g. a phase's colorInk on a soft card). */
  color?: string;
  /** Font size override in px (default 28; widgets/compact use smaller). */
  size?: number;
}

/**
 * The central design moment: the posture words ("SOLIDE · FIABLE · DISCRET"),
 * rendered large in DM Sans 700 caps, separated by mid-dots.
 */
export default function PostureRail({ words, color, size }: PostureRailProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span
            className="hd-posture-word"
            style={{ color, fontSize: size ? `${size}px` : undefined }}
          >
            {word}
          </span>
          {i < words.length - 1 && (
            <span className="hd-posture-sep" aria-hidden="true">
              ·
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

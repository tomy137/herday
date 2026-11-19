import { ZONE_HEX } from '../../constants/phases';
import type { Zone } from '../../constants/phases';
import { ZONE_ICON_PATHS } from '../../lib/zones';

/** A zone's stroke icon (moon, sunrise, sun, sunset) in the zone colour. */
export default function ZoneIcon({ zone, size = 22 }: { zone: Zone; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ stroke: ZONE_HEX[zone] }}
      aria-hidden="true"
    >
      <path d={ZONE_ICON_PATHS[zone]} />
    </svg>
  );
}

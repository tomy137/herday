package app.herdays.widget;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/** Phase data pushed by the app (WidgetBridgePlugin), mirrors PhaseSnapshot in HerDayWidget.swift. */
public class PhaseSnapshot {

    static final String PREFS = "herdays_widget";
    static final String PHASE_KEY = "widget_phase_data";

    /** The four zones of the dial; they group the phases like the ICS periods (Nuit = A, Jour = B). */
    public enum Zone {
        NUIT("nuit", 0xFFDC3D5A, 0xFF8E1F33, 0xFFFAE2E6, "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"),
        AUBE(
            "aube",
            0xFFE5B30B,
            0xFF765600,
            0xFFFBF4DA,
            "M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0"
        ),
        JOUR(
            "jour",
            0xFF2DA87E,
            0xFF1C6B50,
            0xFFE0F2EC,
            "M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        ),
        CREPUSCULE(
            "crepuscule",
            0xFF4A6FB5,
            0xFF2B4475,
            0xFFE4E9F4,
            "M12 10V2M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M16 6l-4 4-4-4M16 18a4 4 0 0 0-8 0"
        );

        final String id;
        /** Zone hue (dial sector). */
        final int color;
        /** Dark tone: centre disc and text (white on it ≥ 4.5:1). */
        final int ink;
        /** Widget background (zone hue mixed 85 % with white). */
        final int background;
        /** Same 24×24 stroke icon as the app (lib/zones.ts). */
        final String iconPath;

        Zone(String id, int color, int ink, int background, String iconPath) {
            this.id = id;
            this.color = color;
            this.ink = ink;
            this.background = background;
            this.iconPath = iconPath;
        }

        static Zone fromId(String id) {
            for (Zone z : values()) {
                if (z.id.equals(id)) return z;
            }
            return null;
        }

        static Zone fromPhase(String phase) {
            switch (phase) {
                case "post_menstrual":
                    return AUBE;
                case "pre_ovulatory":
                case "ovulation":
                    return JOUR;
                case "post_ovulatory":
                    return CREPUSCULE;
                default:
                    return NUIT;
            }
        }

        /**
         * Day range of the zone for a cycle of length L (Nuit runs past the end of the cycle into the
         * next period: L+1 … L+P). Mirrors the engine's phase bounds; null when a very short cycle leaves
         * the zone empty.
         */
        int[] bounds(int L, int P) {
            int[] r;
            switch (this) {
                case NUIT:
                    r = new int[] { L - 5, L + P };
                    break;
                case AUBE:
                    r = new int[] { P + 1, L - 19 };
                    break;
                case JOUR:
                    r = new int[] { Math.max(P + 1, L - 18), L - 12 };
                    break;
                default:
                    r = new int[] { L - 11, L - 6 };
                    break;
            }
            return r[1] >= r[0] ? r : null;
        }
    }

    /** Per-phase colours of the large (posture) widget, as PhaseStyle in HerDayWidget.swift. */
    static int[] phaseStyle(String phase) {
        switch (phase) {
            case "menstruation":
                return new int[] { 0xFFDC3D5A, 0xFFF7D4DB, 0xFF8E1F33 };
            case "post_menstrual":
                return new int[] { 0xFFE5B30B, 0xFFF9EEC9, 0xFF765600 };
            case "pre_ovulatory":
                return new int[] { 0xFF8CCFB8, 0xFFEAF6F2, 0xFF1C6B50 };
            case "ovulation":
                return new int[] { 0xFF2DA87E, 0xFFD1ECE3, 0xFF1C6B50 };
            case "post_ovulatory":
                return new int[] { 0xFF4A6FB5, 0xFFD7DFEF, 0xFF2B4475 };
            case "pre_menstrual":
                return new int[] { 0xFFEC94A4, 0xFFFCECEF, 0xFF8E1F33 };
            default:
                return new int[] { 0xFF8A8A8A, 0xFFEFEFEF, 0xFF6B6B6B };
        }
    }

    String phase = "unknown";
    String phaseLabel = "";
    String range = "";
    int dayInCycle;
    int cycleLength;
    Integer phaseEndsIn;
    List<String> posture = new ArrayList<>();
    String echoHelpful;
    String systemState = "unknown";
    String zone = "";
    String zoneLabel = "";
    Integer zoneEndsIn;
    String postureLabel = "";

    boolean isUnknown() {
        return "unknown".equals(systemState);
    }

    /** Zone from the app payload, else derived from the phase (older payloads). */
    Zone cycleZone() {
        Zone z = Zone.fromId(zone);
        return z != null ? z : Zone.fromPhase(phase);
    }

    static PhaseSnapshot load(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(PHASE_KEY, null);
        PhaseSnapshot s = new PhaseSnapshot();
        if (raw == null) return s;
        try {
            JSONObject json = new JSONObject(raw);
            s.phase = json.optString("phase", "unknown");
            s.phaseLabel = json.optString("phaseLabel", "");
            s.range = json.optString("range", "");
            s.dayInCycle = json.optInt("dayInCycle", 0);
            s.cycleLength = json.optInt("cycleLength", 0);
            s.phaseEndsIn = optInteger(json, "phaseEndsIn");
            JSONArray posture = json.optJSONArray("posture");
            if (posture != null) {
                for (int i = 0; i < posture.length(); i++) s.posture.add(posture.optString(i));
            }
            s.echoHelpful = json.isNull("echoHelpful") ? null : json.optString("echoHelpful", null);
            s.systemState = json.optString("systemState", "");
            s.zone = json.optString("zone", "");
            s.zoneLabel = json.optString("zoneLabel", "");
            s.zoneEndsIn = optInteger(json, "zoneEndsIn");
            s.postureLabel = json.optString("postureLabel", "");
        } catch (Exception e) {
            return new PhaseSnapshot();
        }
        return s;
    }

    private static Integer optInteger(JSONObject json, String key) {
        return json.has(key) && !json.isNull(key) ? json.optInt(key) : null;
    }
}

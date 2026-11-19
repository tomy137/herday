package app.herdays.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.DashPathEffect;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PointF;
import android.graphics.RectF;
import androidx.core.graphics.PathParser;

/**
 * Draws the dial and the flat hormone chart as bitmaps (widgets can't draw freely).
 * Geometry mirrors CycleDial / FlatCycleChart in HerDayWidget.swift.
 */
final class WidgetRenderer {

    private static final int PERIOD_DURATION_GUESS = 5;

    private WidgetRenderer() {}

    /** Angle in degrees, 0 = top, clockwise. Rotated so the ovulation day sits at the top. */
    private static double dialAngle(double day, int L) {
        double offset = -((L - 14 - 0.5) / L) * 360;
        return offset + day / L * 360;
    }

    private static PointF polar(float cx, float cy, float r, double deg) {
        double t = Math.toRadians(deg - 90);
        return new PointF(cx + r * (float) Math.cos(t), cy + r * (float) Math.sin(t));
    }

    private static int withAlpha(int color, double alpha) {
        return (color & 0x00FFFFFF) | ((int) Math.round(alpha * 255) << 24);
    }

    /** Four-zone dial: current zone in full colour, a pointer on today, the zone icon in the centre. */
    static Bitmap dial(PhaseSnapshot s, int size) {
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        float cx = size / 2f;
        float cy = size / 2f;
        float r = size / 2f;
        int L = Math.max(s.cycleLength, 18);
        PhaseSnapshot.Zone cur = s.cycleZone();
        double today = dialAngle(s.dayInCycle - 0.5, L);

        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        fill.setStyle(Paint.Style.FILL);

        // Ring sectors
        RectF outer = new RectF(cx - r * 0.84f, cy - r * 0.84f, cx + r * 0.84f, cy + r * 0.84f);
        RectF inner = new RectF(cx - r * 0.613f, cy - r * 0.613f, cx + r * 0.613f, cy + r * 0.613f);
        for (PhaseSnapshot.Zone z : PhaseSnapshot.Zone.values()) {
            int[] b = z.bounds(L, PERIOD_DURATION_GUESS);
            if (b == null) continue;
            double start = dialAngle(b[0] - 1, L) + 1.2;
            double end = dialAngle(b[1], L) - 1.2;
            float sweep = (float) (end - start);
            Path p = new Path();
            p.arcTo(outer, (float) (start - 90), sweep, true);
            p.arcTo(inner, (float) (end - 90), -sweep, false);
            p.close();
            fill.setColor(withAlpha(z.color, z == cur ? 1 : 0.28));
            c.drawPath(p, fill);
        }

        // Needle on today, across the ring
        Paint needle = new Paint(Paint.ANTI_ALIAS_FLAG);
        needle.setStyle(Paint.Style.STROKE);
        needle.setColor(0xFFFFFFFF);
        needle.setStrokeWidth(size * 5f / 300f);
        needle.setStrokeCap(Paint.Cap.ROUND);
        PointF n1 = polar(cx, cy, r * 0.587f, today);
        PointF n2 = polar(cx, cy, r * 0.853f, today);
        c.drawLine(n1.x, n1.y, n2.x, n2.y, needle);

        // Centre disc
        fill.setColor(cur.ink);
        c.drawCircle(cx, cy, r * 0.547f, fill);

        // Potentiometer-style pointer: base outside the ring, tip pointing to the centre
        Path ptr = new Path();
        PointF tip = polar(cx, cy, r * 0.847f, today);
        PointF b1 = polar(cx, cy, r * 0.993f, today - 6.5);
        PointF b2 = polar(cx, cy, r * 0.993f, today + 6.5);
        PointF ctl = polar(cx, cy, r * (0.993f - 0.027f), today);
        ptr.moveTo(tip.x, tip.y);
        ptr.lineTo(b1.x, b1.y);
        ptr.quadTo(ctl.x, ctl.y, b2.x, b2.y);
        ptr.close();
        c.drawPath(ptr, fill);
        Paint ptrStroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        ptrStroke.setStyle(Paint.Style.STROKE);
        ptrStroke.setColor(0xFFFFFFFF);
        ptrStroke.setStrokeWidth(size * 4f / 300f);
        ptrStroke.setStrokeJoin(Paint.Join.ROUND);
        c.drawPath(ptr, ptrStroke);

        // Zone icon (24×24 stroke icon, as in the app)
        Path icon = PathParser.createPathFromPathData(cur.iconPath);
        float iconSize = size * 0.30f;
        float scale = iconSize / 24f;
        Matrix m = new Matrix();
        m.setScale(scale, scale);
        m.postTranslate(cx - iconSize / 2f, cy - iconSize / 2f);
        icon.transform(m);
        Paint iconPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        iconPaint.setStyle(Paint.Style.STROKE);
        iconPaint.setColor(0xFFFFFFFF);
        iconPaint.setStrokeWidth(2f * scale);
        iconPaint.setStrokeCap(Paint.Cap.ROUND);
        iconPaint.setStrokeJoin(Paint.Join.ROUND);
        c.drawPath(icon, iconPaint);

        return bmp;
    }

    /** Smoothstep interpolation between control points (same look as CycleGraph.tsx). */
    private static double level(double[][] pts, double d) {
        for (int i = 0; i < pts.length - 1; i++) {
            double[] a = pts[i];
            double[] b = pts[i + 1];
            if (d <= b[0]) {
                double span = b[0] - a[0];
                double u = span > 0 ? Math.min(1, Math.max(0, (d - a[0]) / span)) : 1;
                return a[1] + (b[1] - a[1]) * u * u * (3 - 2 * u);
            }
        }
        return pts[pts.length - 1][1];
    }

    /** Control points (day, level 0…1), anchored on ovulation (L − 14). */
    private static double[][] estradiol(int L, int P) {
        double o = L - 14;
        double e = L;
        double p = P;
        return new double[][] {
            { 0, 0.15 },
            { p * 0.6, 0.10 },
            { p + 1, 0.20 },
            { (p + o) / 2, 0.35 },
            { o - 1, 0.85 },
            { o + 1, 0.45 },
            { o + (e - o) * 0.4, 0.62 },
            { e - 2, 0.22 },
            { e, 0.10 },
        };
    }

    private static double[][] progesterone(int L) {
        double o = L - 14;
        double e = L;
        return new double[][] { { 0, 0.08 }, { o - 1, 0.08 }, { o + 1, 0.22 }, { o + (e - o) * 0.5, 0.78 }, { e - 2, 0.30 }, { e, 0.05 } };
    }

    private static Path curve(double[][] pts, int L, float w, float h) {
        Path p = new Path();
        for (double t = 0; t <= L; t += 0.25) {
            float x = (float) (t / L) * w;
            float y = h - (float) level(pts, t) * h * 0.92f;
            if (t == 0) p.moveTo(x, y);
            else p.lineTo(x, y);
        }
        return p;
    }

    /** Flat cycle chart: zone bands, estradiol (solid) and progesterone (dashed), cursor on today. */
    static Bitmap chart(PhaseSnapshot s, int w, int h, float density) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        int L = Math.max(s.cycleLength, 18);
        PhaseSnapshot.Zone cur = s.cycleZone();

        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        for (PhaseSnapshot.Zone z : PhaseSnapshot.Zone.values()) {
            int[] b = z.bounds(L, PERIOD_DURATION_GUESS);
            if (b == null) continue;
            fill.setColor(withAlpha(z.color, z == cur ? 0.3 : 0.1));
            if (b[1] > L) {
                c.drawRect((float) (b[0] - 1) / L * w, 0, w, h, fill);
                c.drawRect(0, 0, (float) (b[1] - L) / L * w, h, fill);
            } else {
                c.drawRect((float) (b[0] - 1) / L * w, 0, (float) b[1] / L * w, h, fill);
            }
        }

        Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
        line.setStyle(Paint.Style.STROKE);
        line.setStrokeWidth(1.6f * density);
        line.setStrokeJoin(Paint.Join.ROUND);
        line.setColor(0xFF2D2A26);
        c.drawPath(curve(estradiol(L, PERIOD_DURATION_GUESS), L, w, h), line);
        line.setColor(0xFF7A6F5E);
        line.setPathEffect(new DashPathEffect(new float[] { 3 * density, 2 * density }, 0));
        c.drawPath(curve(progesterone(L), L, w, h), line);

        fill.setColor(cur.ink);
        float x = (float) ((s.dayInCycle - 0.5) / L) * w;
        float half = 0.75f * density;
        c.drawRect(x - half, 0, x + half, h, fill);
        return bmp;
    }
}

package app.herdays.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.content.res.Resources;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.view.View;
import android.widget.RemoteViews;
import app.herdays.MainActivity;
import app.herdays.R;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Home-screen widget « Cycle HerDays »: one resizable widget whose layout follows its size
 * (small = dial, medium = dial + text + chart, large = posture), like the iOS widget families.
 */
public class HerDaysWidgetProvider extends AppWidgetProvider {

    private static final int DIAL_PX = 360;
    private static final float MEDIUM_MIN_WIDTH_DP = 220;
    private static final float LARGE_MIN_HEIGHT_DP = 230;

    /** Redraws every placed widget (called after the app pushes new phase data). */
    public static void updateAll(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, HerDaysWidgetProvider.class));
        for (int id : ids) update(context, mgr, id);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) update(context, mgr, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager mgr, int id, Bundle options) {
        update(context, mgr, id);
    }

    private static void update(Context context, AppWidgetManager mgr, int id) {
        PhaseSnapshot s = PhaseSnapshot.load(context);
        RemoteViews views;
        if (s.isUnknown()) {
            views = new RemoteViews(context.getPackageName(), R.layout.widget_unknown);
            setOpenApp(context, views);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+: the launcher picks the largest layout that fits, also while resizing.
            Map<SizeF, RemoteViews> layouts = new HashMap<>();
            layouts.put(new SizeF(40, 40), small(context, s));
            layouts.put(new SizeF(MEDIUM_MIN_WIDTH_DP, 40), medium(context, s));
            layouts.put(new SizeF(MEDIUM_MIN_WIDTH_DP, LARGE_MIN_HEIGHT_DP), large(context, s));
            views = new RemoteViews(layouts);
        } else {
            Bundle o = mgr.getAppWidgetOptions(id);
            int w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 110);
            int h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 110);
            if (w >= MEDIUM_MIN_WIDTH_DP && h >= LARGE_MIN_HEIGHT_DP) views = large(context, s);
            else if (w >= MEDIUM_MIN_WIDTH_DP) views = medium(context, s);
            else views = small(context, s);
        }
        mgr.updateAppWidget(id, views);
    }

    private static RemoteViews small(Context context, PhaseSnapshot s) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_small);
        v.setInt(android.R.id.background, "setBackgroundColor", s.cycleZone().background);
        v.setImageViewBitmap(R.id.dial, WidgetRenderer.dial(s, DIAL_PX));
        v.setContentDescription(R.id.dial, s.zoneLabel + " · " + s.phaseLabel);
        setOpenApp(context, v);
        return v;
    }

    private static RemoteViews medium(Context context, PhaseSnapshot s) {
        Resources res = context.getResources();
        float density = res.getDisplayMetrics().density;
        int ink = s.cycleZone().ink;
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_medium);
        v.setInt(android.R.id.background, "setBackgroundColor", s.cycleZone().background);
        v.setImageViewBitmap(R.id.dial, WidgetRenderer.dial(s, DIAL_PX));
        String day = res.getString(R.string.widget_day, s.dayInCycle);
        v.setTextViewText(R.id.zone_day, s.zoneLabel.toUpperCase(Locale.getDefault()) + " · " + day);
        v.setTextViewText(R.id.phase, s.phaseLabel);
        v.setTextViewText(R.id.days_left, zoneDaysLeft(res, s));
        v.setTextColor(R.id.zone_day, ink);
        v.setTextColor(R.id.phase, ink);
        v.setTextColor(R.id.days_left, ink);
        v.setImageViewBitmap(R.id.chart, WidgetRenderer.chart(s, Math.round(200 * density), Math.round(56 * density), density));
        setOpenApp(context, v);
        return v;
    }

    private static RemoteViews large(Context context, PhaseSnapshot s) {
        Resources res = context.getResources();
        int[] style = PhaseSnapshot.phaseStyle(s.phase); // primary, soft, ink
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_large);
        v.setInt(R.id.dot, "setColorFilter", style[0]);
        v.setTextViewText(R.id.day, res.getString(R.string.widget_day, s.dayInCycle));
        v.setTextViewText(R.id.phase, s.phaseLabel);
        v.setTextViewText(R.id.range, s.range.isEmpty() ? "" : "— " + s.range.toLowerCase(Locale.getDefault()));
        if (s.phaseEndsIn != null) {
            v.setTextViewText(R.id.days, s.phaseEndsIn + " " + res.getString(R.string.widget_days_unit));
            v.setTextColor(R.id.days, style[2]);
        } else {
            v.setViewVisibility(R.id.days, View.GONE);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            v.setColorStateList(R.id.posture_box, "setBackgroundTintList", ColorStateList.valueOf(style[1]));
        } else {
            v.setInt(R.id.posture_box, "setBackgroundColor", style[1]);
        }
        String label = s.postureLabel.isEmpty() ? res.getString(R.string.widget_posture_fallback) : s.postureLabel;
        v.setTextViewText(R.id.posture_label, label.toUpperCase(Locale.getDefault()));
        v.setTextColor(R.id.posture_label, (style[2] & 0x00FFFFFF) | 0xB3000000);
        StringBuilder posture = new StringBuilder();
        for (int i = 0; i < Math.min(4, s.posture.size()); i++) {
            if (i > 0) posture.append(" · ");
            posture.append(s.posture.get(i).toUpperCase(Locale.getDefault()));
        }
        v.setTextViewText(R.id.posture, posture.toString());
        v.setTextColor(R.id.posture, style[2]);
        if (s.echoHelpful != null && !s.echoHelpful.isEmpty()) {
            v.setTextViewText(R.id.echo, "« " + s.echoHelpful + " »");
        } else {
            v.setViewVisibility(R.id.echo_block, View.GONE);
        }
        setOpenApp(context, v);
        return v;
    }

    private static String zoneDaysLeft(Resources res, PhaseSnapshot s) {
        if (s.zoneEndsIn == null) return "";
        int n = s.zoneEndsIn;
        if (n <= 0) return res.getString(R.string.widget_last_day);
        return res.getQuantityString(R.plurals.widget_days_left, n, n);
    }

    /** Tapping the widget opens the app. */
    private static void setOpenApp(Context context, RemoteViews v) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        v.setOnClickPendingIntent(android.R.id.background, pi);
    }
}

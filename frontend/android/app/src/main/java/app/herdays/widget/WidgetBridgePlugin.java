package app.herdays.widget;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Android side of src/native/widgetBridge.ts (WidgetBridgePlugin.swift on iOS). */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void setPhaseData(PluginCall call) {
        JSObject payload = call.getData();
        SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        iso.setTimeZone(TimeZone.getTimeZone("UTC"));
        payload.put("updatedAt", iso.format(new Date()));

        Context context = getContext();
        boolean saved = context
            .getSharedPreferences(PhaseSnapshot.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(PhaseSnapshot.PHASE_KEY, payload.toString())
            .commit();
        if (!saved) {
            call.reject("Écriture des données du widget impossible");
            return;
        }
        HerDaysWidgetProvider.updateAll(context);

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPhaseData(PluginCall call) {
        Context context = getContext();
        context.getSharedPreferences(PhaseSnapshot.PREFS, Context.MODE_PRIVATE).edit().remove(PhaseSnapshot.PHASE_KEY).commit();
        HerDaysWidgetProvider.updateAll(context);

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }
}

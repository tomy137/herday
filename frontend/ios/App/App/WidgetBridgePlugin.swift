import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setPhaseData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPhaseData", returnType: CAPPluginReturnPromise),
    ]

    static let appGroupId = "group.app.herdays.shared"
    static let phaseKey = "widget_phase_data"
    static let widgetKind = "HerDayPhaseWidget"

    @objc func setPhaseData(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroupId) else {
            call.reject("App Group \(Self.appGroupId) unavailable. Vérifie que l'App Group est activé sur la target App et qu'il porte le bon identifiant.")
            return
        }

        let posture = call.getArray("posture", String.self) ?? []
        let payload: [String: Any] = [
            "phase": call.getString("phase") ?? "",
            "phaseLabel": call.getString("phaseLabel") ?? "",
            "dayInCycle": call.getInt("dayInCycle") ?? 0,
            "cycleLength": call.getInt("cycleLength") ?? 0,
            "nextPeriodIn": call.getInt("nextPeriodIn") as Any,
            "phaseEndsIn": call.getInt("phaseEndsIn") as Any,
            "tipTitle": call.getString("tipTitle") ?? "",
            "tipBody": call.getString("tipBody") ?? "",
            "systemState": call.getString("systemState") ?? "",
            // V2 posture widget fields
            "posture": posture,
            "range": call.getString("range") ?? "",
            "phaseSpan": call.getInt("phaseSpan") ?? 1,
            "phaseDayIdx": call.getInt("phaseDayIdx") ?? 1,
            "echoHelpful": call.getString("echoHelpful") as Any,
            "updatedAt": ISO8601DateFormatter().string(from: Date()),
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []) else {
            call.reject("Sérialisation JSON impossible")
            return
        }

        defaults.set(data, forKey: Self.phaseKey)
        defaults.synchronize()

        let readback = defaults.data(forKey: Self.phaseKey)
        if readback == nil {
            call.reject("App Group write succeeded but read-back returned nil — entitlement likely not active at runtime.")
            return
        }

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: Self.widgetKind)
        }

        call.resolve(["ok": true, "bytes": readback!.count])
    }

    @objc func clearPhaseData(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroupId) else {
            call.reject("App Group \(Self.appGroupId) unavailable")
            return
        }
        defaults.removeObject(forKey: Self.phaseKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: Self.widgetKind)
        }
        call.resolve(["ok": true])
    }
}

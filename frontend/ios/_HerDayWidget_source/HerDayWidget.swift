import WidgetKit
import SwiftUI

private let appGroupId = "group.app.herdays.shared"
private let phaseKey = "widget_phase_data"

struct PhaseSnapshot {
    var phase: String
    var phaseLabel: String
    var dayInCycle: Int
    var cycleLength: Int
    var nextPeriodIn: Int?
    var tipTitle: String
    var tipBody: String
    var systemState: String

    static let placeholder = PhaseSnapshot(
        phase: "follicular",
        phaseLabel: "Phase folliculaire",
        dayInCycle: 7,
        cycleLength: 28,
        nextPeriodIn: 21,
        tipTitle: "Énergie en hausse",
        tipBody: "Bon moment pour les projets ambitieux et les conversations importantes.",
        systemState: "active"
    )

    static let unknown = PhaseSnapshot(
        phase: "unknown",
        phaseLabel: "En apprentissage",
        dayInCycle: 0,
        cycleLength: 0,
        nextPeriodIn: nil,
        tipTitle: "Ouvre HerDay",
        tipBody: "Renseigne un début de règles pour activer le suivi.",
        systemState: "unknown"
    )

    static func load() -> PhaseSnapshot {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let data = defaults.data(forKey: phaseKey),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return .unknown
        }
        return PhaseSnapshot(
            phase: json["phase"] as? String ?? "unknown",
            phaseLabel: json["phaseLabel"] as? String ?? "",
            dayInCycle: json["dayInCycle"] as? Int ?? 0,
            cycleLength: json["cycleLength"] as? Int ?? 0,
            nextPeriodIn: json["nextPeriodIn"] as? Int,
            tipTitle: json["tipTitle"] as? String ?? "",
            tipBody: json["tipBody"] as? String ?? "",
            systemState: json["systemState"] as? String ?? ""
        )
    }
}

struct PhaseEntry: TimelineEntry {
    let date: Date
    let snapshot: PhaseSnapshot
}

struct PhaseProvider: TimelineProvider {
    func placeholder(in context: Context) -> PhaseEntry {
        PhaseEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (PhaseEntry) -> Void) {
        completion(PhaseEntry(date: Date(), snapshot: PhaseSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PhaseEntry>) -> Void) {
        let now = Date()
        let snapshot = PhaseSnapshot.load()
        let entry = PhaseEntry(date: now, snapshot: snapshot)
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 6, to: now) ?? now.addingTimeInterval(6 * 3600)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

private struct PhaseStyle {
    let primary: Color
    let secondary: Color
    let icon: String

    static func from(_ phase: String) -> PhaseStyle {
        switch phase {
        case "menstruation":
            return PhaseStyle(primary: Color(red: 0.86, green: 0.24, blue: 0.35), secondary: Color(red: 0.91, green: 0.39, blue: 0.49), icon: "🔴")
        case "follicular":
            return PhaseStyle(primary: Color(red: 0.18, green: 0.66, blue: 0.49), secondary: Color(red: 0.30, green: 0.77, blue: 0.62), icon: "🌱")
        case "ovulation":
            return PhaseStyle(primary: Color(red: 0.83, green: 0.53, blue: 0.06), secondary: Color(red: 0.91, green: 0.66, blue: 0.23), icon: "🌟")
        case "luteal":
            return PhaseStyle(primary: Color(red: 0.49, green: 0.31, blue: 0.82), secondary: Color(red: 0.62, green: 0.47, blue: 0.88), icon: "🌙")
        default:
            return PhaseStyle(primary: Color.gray, secondary: Color.gray.opacity(0.7), icon: "🕵️")
        }
    }
}

struct HerDayWidgetSmallView: View {
    let snapshot: PhaseSnapshot

    var body: some View {
        let style = PhaseStyle.from(snapshot.phase)
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text(style.icon).font(.title3)
                Text(snapshot.phaseLabel)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(style.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            Spacer(minLength: 0)
            if snapshot.systemState == "unknown" {
                Text(snapshot.tipTitle)
                    .font(.headline)
                    .foregroundColor(style.primary)
                    .lineLimit(2)
            } else {
                Text("J\(snapshot.dayInCycle)")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(style.primary)
                if let n = snapshot.nextPeriodIn {
                    Text("Règles dans \(n) j")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct HerDayWidgetMediumView: View {
    let snapshot: PhaseSnapshot

    var body: some View {
        let style = PhaseStyle.from(snapshot.phase)
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(style.icon).font(.title3)
                    Text(snapshot.phaseLabel)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(style.primary)
                        .lineLimit(1)
                }
                if snapshot.systemState != "unknown" {
                    Text("J\(snapshot.dayInCycle)")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundColor(style.primary)
                    if let n = snapshot.nextPeriodIn {
                        Text("Règles dans \(n) j")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(width: 100, alignment: .leading)

            VStack(alignment: .leading, spacing: 4) {
                if !snapshot.tipTitle.isEmpty {
                    Text(snapshot.tipTitle)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(style.primary)
                        .lineLimit(1)
                }
                Text(snapshot.tipBody)
                    .font(.caption)
                    .foregroundColor(.primary.opacity(0.85))
                    .lineLimit(4)
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct HerDayWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: PhaseEntry

    var body: some View {
        let style = PhaseStyle.from(entry.snapshot.phase)
        Group {
            switch family {
            case .systemMedium:
                HerDayWidgetMediumView(snapshot: entry.snapshot)
            default:
                HerDayWidgetSmallView(snapshot: entry.snapshot)
            }
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [style.primary.opacity(0.08), style.secondary.opacity(0.04)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

struct HerDayPhaseWidget: Widget {
    let kind: String = "HerDayPhaseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PhaseProvider()) { entry in
            HerDayWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Phase HerDay")
        .description("Phase actuelle du cycle et tip du jour.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

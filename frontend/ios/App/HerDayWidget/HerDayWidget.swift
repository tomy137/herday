import WidgetKit
import SwiftUI

private let appGroupId = "group.app.herdays.shared"
private let phaseKey = "widget_phase_data"

// MARK: - Snapshot

struct PhaseSnapshot {
    var phase: String
    var phaseLabel: String
    var range: String
    var dayInCycle: Int
    var cycleLength: Int
    var nextPeriodIn: Int?
    var phaseEndsIn: Int?
    var posture: [String]
    var phaseSpan: Int
    var phaseDayIdx: Int
    var echoHelpful: String?
    var systemState: String

    static let placeholder = PhaseSnapshot(
        phase: "pre_ovulatory",
        phaseLabel: "Pré-ovulatoire",
        range: "2 à 3 jours avant l'ovulation",
        dayInCycle: 11,
        cycleLength: 28,
        nextPeriodIn: 18,
        phaseEndsIn: 1,
        posture: ["COÉQUIPIER", "DISPONIBLE", "CURIEUX DE SES IDÉES", "DANS L'ACTION"],
        phaseSpan: 3,
        phaseDayIdx: 1,
        echoHelpful: "Dit oui à la sortie improvisée",
        systemState: "active"
    )

    static let unknown = PhaseSnapshot(
        phase: "unknown",
        phaseLabel: "En apprentissage",
        range: "",
        dayInCycle: 0,
        cycleLength: 0,
        nextPeriodIn: nil,
        phaseEndsIn: nil,
        posture: [],
        phaseSpan: 1,
        phaseDayIdx: 1,
        echoHelpful: nil,
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
            range: json["range"] as? String ?? "",
            dayInCycle: json["dayInCycle"] as? Int ?? 0,
            cycleLength: json["cycleLength"] as? Int ?? 0,
            nextPeriodIn: json["nextPeriodIn"] as? Int,
            phaseEndsIn: json["phaseEndsIn"] as? Int,
            posture: json["posture"] as? [String] ?? [],
            phaseSpan: json["phaseSpan"] as? Int ?? 1,
            phaseDayIdx: json["phaseDayIdx"] as? Int ?? 1,
            echoHelpful: json["echoHelpful"] as? String,
            systemState: json["systemState"] as? String ?? ""
        )
    }

    var daysLeftLabel: String {
        guard let n = phaseEndsIn, n > 0 else { return "bascule aujourd'hui" }
        return n == 1 ? "1 j restant" : "\(n) j restants"
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
        let entry = PhaseEntry(date: now, snapshot: PhaseSnapshot.load())
        let next = Calendar.current.date(byAdding: .hour, value: 6, to: now) ?? now.addingTimeInterval(21600)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Phase palette (matches the app's tokens)

private struct PhaseStyle {
    let primary: Color
    let soft: Color
    let ink: Color

    static func from(_ phase: String) -> PhaseStyle {
        func c(_ r: Double, _ g: Double, _ b: Double) -> Color { Color(red: r, green: g, blue: b) }
        switch phase {
        case "menstruation":
            return PhaseStyle(primary: c(0.863, 0.239, 0.353), soft: c(0.984, 0.918, 0.933), ink: c(0.557, 0.122, 0.200))
        case "post_menstrual":
            return PhaseStyle(primary: c(0.498, 0.812, 0.682), soft: c(0.918, 0.965, 0.941), ink: c(0.180, 0.451, 0.333))
        case "pre_ovulatory":
            return PhaseStyle(primary: c(0.176, 0.659, 0.494), soft: c(0.902, 0.957, 0.933), ink: c(0.110, 0.420, 0.314))
        case "ovulation":
            return PhaseStyle(primary: c(0.831, 0.533, 0.059), soft: c(0.984, 0.941, 0.863), ink: c(0.541, 0.337, 0.039))
        case "post_ovulatory":
            return PhaseStyle(primary: c(0.620, 0.471, 0.878), soft: c(0.941, 0.918, 0.980), ink: c(0.357, 0.239, 0.620))
        case "pre_menstrual":
            return PhaseStyle(primary: c(0.365, 0.227, 0.620), soft: c(0.925, 0.906, 0.961), ink: c(0.255, 0.165, 0.431))
        default:
            return PhaseStyle(primary: .gray, soft: Color.gray.opacity(0.12), ink: Color.gray)
        }
    }
}

private struct WidgetHeader: View {
    let style: PhaseStyle
    let day: Int
    var body: some View {
        HStack {
            HStack(spacing: 5) {
                RoundedRectangle(cornerRadius: 2).fill(style.primary).frame(width: 7, height: 7)
                Text("HERDAY").font(.system(size: 9, weight: .medium)).tracking(0.6).foregroundColor(.secondary)
            }
            Spacer()
            Text("J\(day)").font(.system(size: 9, weight: .medium)).foregroundColor(.secondary)
        }
    }
}

private struct PostureStack: View {
    let words: [String]
    let color: Color
    let size: CGFloat
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            ForEach(words.prefix(4), id: \.self) { w in
                Text(w.uppercased())
                    .font(.system(size: size, weight: .bold))
                    .tracking(0.3)
                    .foregroundColor(color)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
        }
    }
}

// MARK: - Home-screen widgets

struct SmallPostureView: View {
    let s: PhaseSnapshot
    var body: some View {
        let style = PhaseStyle.from(s.phase)
        VStack(alignment: .leading, spacing: 4) {
            WidgetHeader(style: style, day: s.dayInCycle)
            if s.systemState == "unknown" {
                Spacer(minLength: 0)
                Text("Ouvre HerDay").font(.headline).foregroundColor(style.ink)
                Text("pour activer le suivi").font(.caption2).foregroundColor(.secondary)
            } else {
                Text("ELLE A BESOIN QUE TU SOIS")
                    .font(.system(size: 8, weight: .medium)).tracking(0.5)
                    .foregroundColor(style.ink.opacity(0.7)).lineLimit(1).minimumScaleFactor(0.7)
                Spacer(minLength: 0)
                PostureStack(words: Array(s.posture.prefix(3)), color: style.ink, size: 15)
                Spacer(minLength: 0)
                HStack {
                    Text(s.phaseLabel.lowercased()).font(.system(size: 9.5)).foregroundColor(style.ink.opacity(0.7)).lineLimit(1)
                    Spacer()
                    Text(s.daysLeftLabel).font(.system(size: 8.5, weight: .medium)).foregroundColor(style.ink.opacity(0.7))
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct MediumView: View {
    let s: PhaseSnapshot
    var body: some View {
        let style = PhaseStyle.from(s.phase)
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                WidgetHeader(style: style, day: s.dayInCycle)
                Spacer(minLength: 8)
                Text("PHASE").font(.system(size: 8, weight: .medium)).tracking(0.5).foregroundColor(style.ink.opacity(0.7))
                Text(s.phaseLabel).font(.system(size: 14, weight: .bold)).foregroundColor(style.ink).lineLimit(1).minimumScaleFactor(0.7)
                Text(s.range.lowercased()).font(.system(size: 11)).italic().foregroundColor(style.ink.opacity(0.65)).lineLimit(2)
            }
            .frame(width: 122, alignment: .leading)

            Rectangle().fill(style.primary.opacity(0.25)).frame(width: 0.5)

            VStack(alignment: .leading, spacing: 0) {
                Text("ELLE A BESOIN QUE TU SOIS")
                    .font(.system(size: 8, weight: .medium)).tracking(0.5)
                    .foregroundColor(style.ink.opacity(0.7)).lineLimit(1).minimumScaleFactor(0.7)
                Spacer(minLength: 6)
                PostureStack(words: Array(s.posture.prefix(4)), color: style.ink, size: 17)
                Spacer(minLength: 6)
                Text(s.daysLeftLabel.uppercased())
                    .font(.system(size: 8, weight: .medium)).tracking(0.4)
                    .foregroundColor(style.ink.opacity(0.55))
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct LargeView: View {
    let s: PhaseSnapshot
    var body: some View {
        let style = PhaseStyle.from(s.phase)
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(style: style, day: s.dayInCycle)
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(s.phaseLabel).font(.system(size: 16, weight: .bold)).foregroundColor(.primary)
                    Text("— \(s.range.lowercased())").font(.system(size: 12)).italic().foregroundColor(.secondary).lineLimit(1)
                }
                Spacer()
                if let n = s.phaseEndsIn {
                    HStack(alignment: .firstTextBaseline, spacing: 1) {
                        Text("\(n)").font(.system(size: 22, weight: .semibold)).foregroundColor(style.ink)
                        Text("j").font(.system(size: 11, weight: .medium)).foregroundColor(style.ink)
                    }
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("ELLE A BESOIN QUE TU SOIS").font(.system(size: 8, weight: .medium)).tracking(0.5).foregroundColor(style.ink.opacity(0.7))
                Text(s.posture.prefix(4).map { $0.uppercased() }.joined(separator: " · "))
                    .font(.system(size: 15, weight: .bold)).foregroundColor(style.ink).lineLimit(2).minimumScaleFactor(0.7)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(style.soft)
            .cornerRadius(10)
            if let echo = s.echoHelpful, !echo.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text("ÉCHO · CYCLE PRÉCÉDENT").font(.system(size: 8, weight: .medium)).tracking(0.5).foregroundColor(.secondary)
                        Spacer()
                        Text("A AIDÉ").font(.system(size: 8, weight: .medium)).foregroundColor(Color(red: 0.176, green: 0.659, blue: 0.494))
                    }
                    Text("« \(echo) »").font(.system(size: 11.5)).foregroundColor(.primary.opacity(0.85)).lineLimit(2)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Lock-screen (accessory) widgets

struct AccessoryInlineView: View {
    let s: PhaseSnapshot
    var body: some View {
        Text(s.posture.prefix(2).joined(separator: " · "))
    }
}

struct AccessoryCircularView: View {
    let s: PhaseSnapshot
    var body: some View {
        Gauge(value: Double(s.phaseDayIdx), in: 0...Double(max(s.phaseSpan, 1))) {
            Text("")
        } currentValueLabel: {
            Text("\(s.phaseDayIdx)").font(.system(size: 16, weight: .semibold))
        }
        .gaugeStyle(.accessoryCircular)
    }
}

struct AccessoryRectangularView: View {
    let s: PhaseSnapshot
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(s.posture.prefix(2).joined(separator: " · ").uppercased())
                .font(.system(size: 13, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.7)
            Text("\(s.phaseLabel.lowercased()) · \(s.daysLeftLabel)")
                .font(.system(size: 10)).foregroundColor(.secondary).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Entry view + configuration

struct HerDayWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: PhaseEntry

    var body: some View {
        let s = entry.snapshot
        let style = PhaseStyle.from(s.phase)
        switch family {
        case .accessoryInline:
            AccessoryInlineView(s: s)
        case .accessoryCircular:
            AccessoryCircularView(s: s).containerBackground(.clear, for: .widget)
        case .accessoryRectangular:
            AccessoryRectangularView(s: s).containerBackground(.clear, for: .widget)
        case .systemLarge:
            LargeView(s: s).containerBackground(Color(red: 0.992, green: 0.984, blue: 0.969), for: .widget)
        case .systemMedium:
            MediumView(s: s).containerBackground(style.soft, for: .widget)
        default:
            SmallPostureView(s: s).containerBackground(style.soft, for: .widget)
        }
    }
}

struct HerDayPhaseWidget: Widget {
    let kind: String = "HerDayPhaseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PhaseProvider()) { entry in
            HerDayWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Posture HerDay")
        .description("La posture à adopter aujourd'hui, et la progression dans la phase.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryInline, .accessoryCircular, .accessoryRectangular,
        ])
    }
}

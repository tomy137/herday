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
    var zone: String
    var zoneLabel: String
    var zoneEndsIn: Int?
    var postureLabel: String

    static let placeholder = PhaseSnapshot(
        phase: "pre_ovulatory",
        phaseLabel: "Pré-ovulatoire",
        range: "2 à 3 jours avant l'ovulation",
        dayInCycle: 11,
        cycleLength: 28,
        nextPeriodIn: 18,
        phaseEndsIn: 0,
        posture: ["COÉQUIPIER", "DISPONIBLE", "CURIEUX DE SES IDÉES", "DANS L'ACTION"],
        phaseSpan: 2,
        phaseDayIdx: 2,
        echoHelpful: "Dit oui à la sortie improvisée",
        systemState: "active",
        zone: "jour",
        zoneLabel: "Jour",
        zoneEndsIn: 5,
        postureLabel: "Elle a besoin que tu sois"
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
        systemState: "unknown",
        zone: "",
        zoneLabel: "",
        zoneEndsIn: nil,
        postureLabel: ""
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
            systemState: json["systemState"] as? String ?? "",
            zone: json["zone"] as? String ?? "",
            zoneLabel: json["zoneLabel"] as? String ?? "",
            zoneEndsIn: json["zoneEndsIn"] as? Int,
            postureLabel: json["postureLabel"] as? String ?? ""
        )
    }

    var daysLeftLabel: String {
        guard let n = phaseEndsIn, n > 0 else { return "bascule aujourd'hui" }
        return n == 1 ? "1 j restant" : "\(n) j restants"
    }

    /// Zone from the app payload, else derived from the phase (older payloads).
    var cycleZone: CycleZone {
        CycleZone(rawValue: zone) ?? CycleZone.from(phase: phase)
    }

    var zoneDaysLeftLabel: String {
        guard let n = zoneEndsIn else { return "" }
        if n <= 0 { return "dernier jour" }
        return n == 1 ? "encore 1 jour" : "encore \(n) jours"
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

// MARK: - Palette "4 teintes" (matches the app's tokens, constants/phases.ts)

private func hex(_ v: UInt32) -> Color {
    Color(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
}

/// The four zones of the dial; they group the phases like the ICS periods
/// (Nuit = Période A, Jour = Période B).
enum CycleZone: String, CaseIterable {
    case nuit, aube, jour, crepuscule

    static func from(phase: String) -> CycleZone {
        switch phase {
        case "post_menstrual": return .aube
        case "pre_ovulatory", "ovulation": return .jour
        case "post_ovulatory": return .crepuscule
        default: return .nuit
        }
    }

    var color: Color {
        switch self {
        case .nuit: return hex(0xDC3D5A)
        case .aube: return hex(0xE5B30B)
        case .jour: return hex(0x2DA87E)
        case .crepuscule: return hex(0x4A6FB5)
        }
    }

    /// Dark tone: centre disc and text (white on it ≥ 4.5:1).
    var ink: Color {
        switch self {
        case .nuit: return hex(0x8E1F33)
        case .aube: return hex(0x765600)
        case .jour: return hex(0x1C6B50)
        case .crepuscule: return hex(0x2B4475)
        }
    }

    /// Widget background (zone hue mixed 85 % with white).
    var background: Color {
        switch self {
        case .nuit: return hex(0xFAE2E6)
        case .aube: return hex(0xFBF4DA)
        case .jour: return hex(0xE0F2EC)
        case .crepuscule: return hex(0xE4E9F4)
        }
    }

    var symbol: String {
        switch self {
        case .nuit: return "moon"
        case .aube: return "sunrise"
        case .jour: return "sun.max"
        case .crepuscule: return "sunset"
        }
    }

    /// Day range of the zone for a cycle of length `L` (Nuit runs past the end
    /// of the cycle into the next period: L+1 … L+P). Mirrors the engine's
    /// phase bounds; nil when a very short cycle leaves the zone empty.
    func bounds(cycleLength L: Int, periodDuration P: Int) -> (Int, Int)? {
        let range: (Int, Int)
        switch self {
        case .nuit: range = (L - 5, L + P)
        case .aube: range = (P + 1, L - 19)
        case .jour: range = (max(P + 1, L - 18), L - 12)
        case .crepuscule: range = (L - 11, L - 6)
        }
        return range.1 >= range.0 ? range : nil
    }
}

private struct PhaseStyle {
    let primary: Color
    let soft: Color
    let ink: Color

    static func from(_ phase: String) -> PhaseStyle {
        switch phase {
        case "menstruation":
            return PhaseStyle(primary: hex(0xDC3D5A), soft: hex(0xF7D4DB), ink: hex(0x8E1F33))
        case "post_menstrual":
            return PhaseStyle(primary: hex(0xE5B30B), soft: hex(0xF9EEC9), ink: hex(0x765600))
        case "pre_ovulatory":
            return PhaseStyle(primary: hex(0x8CCFB8), soft: hex(0xEAF6F2), ink: hex(0x1C6B50))
        case "ovulation":
            return PhaseStyle(primary: hex(0x2DA87E), soft: hex(0xD1ECE3), ink: hex(0x1C6B50))
        case "post_ovulatory":
            return PhaseStyle(primary: hex(0x4A6FB5), soft: hex(0xD7DFEF), ink: hex(0x2B4475))
        case "pre_menstrual":
            return PhaseStyle(primary: hex(0xEC94A4), soft: hex(0xFCECEF), ink: hex(0x8E1F33))
        default:
            return PhaseStyle(primary: .gray, soft: Color.gray.opacity(0.12), ink: Color.gray)
        }
    }
}

// MARK: - Dial geometry

private let periodDurationGuess = 5

/// Angle in degrees, 0 = top, clockwise. The dial is rotated so the ovulation
/// day sits at the top (the "sun" is up).
private func dialAngle(_ day: Double, cycleLength L: Int) -> Double {
    let offset = -((Double(L) - 14 - 0.5) / Double(L)) * 360
    return offset + day / Double(L) * 360
}

private func polar(_ c: CGPoint, _ r: CGFloat, _ deg: Double) -> CGPoint {
    let t = (deg - 90) * .pi / 180
    return CGPoint(x: c.x + r * CGFloat(cos(t)), y: c.y + r * CGFloat(sin(t)))
}

/// Annular sector between two angles; radii are fractions of the half-size.
private struct RingSector: Shape {
    let start: Double
    let end: Double
    let inner: CGFloat
    let outer: CGFloat

    func path(in rect: CGRect) -> Path {
        let c = CGPoint(x: rect.midX, y: rect.midY)
        let r = min(rect.width, rect.height) / 2
        var p = Path()
        p.addArc(center: c, radius: r * outer, startAngle: .degrees(start - 90), endAngle: .degrees(end - 90), clockwise: false)
        p.addArc(center: c, radius: r * inner, startAngle: .degrees(end - 90), endAngle: .degrees(start - 90), clockwise: true)
        p.closeSubpath()
        return p
    }
}

/// Potentiometer-style pointer: base outside the ring, tip pointing to the centre.
private struct DialPointer: Shape {
    let angle: Double
    let tip: CGFloat
    let base: CGFloat
    let half: Double

    func path(in rect: CGRect) -> Path {
        let c = CGPoint(x: rect.midX, y: rect.midY)
        let r = min(rect.width, rect.height) / 2
        var p = Path()
        p.move(to: polar(c, r * tip, angle))
        p.addLine(to: polar(c, r * base, angle - half))
        p.addQuadCurve(to: polar(c, r * base, angle + half), control: polar(c, r * (base - 0.027), angle))
        p.closeSubpath()
        return p
    }
}

private struct DialNeedle: Shape {
    let angle: Double
    let from: CGFloat
    let to: CGFloat

    func path(in rect: CGRect) -> Path {
        let c = CGPoint(x: rect.midX, y: rect.midY)
        let r = min(rect.width, rect.height) / 2
        var p = Path()
        p.move(to: polar(c, r * from, angle))
        p.addLine(to: polar(c, r * to, angle))
        return p
    }
}

/// Four-zone dial: the current zone in full colour, a pointer on today, and
/// the zone's icon large in the centre. `mono` renders the lock-screen version.
struct CycleDial: View {
    let s: PhaseSnapshot
    var mono = false

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let L = max(s.cycleLength, 18)
            let cur = s.cycleZone
            let today = dialAngle(Double(s.dayInCycle) - 0.5, cycleLength: L)
            ZStack {
                ForEach(CycleZone.allCases, id: \.self) { z in
                    if let b = z.bounds(cycleLength: L, periodDuration: periodDurationGuess) {
                        RingSector(
                            start: dialAngle(Double(b.0 - 1), cycleLength: L) + 1.2,
                            end: dialAngle(Double(b.1), cycleLength: L) - 1.2,
                            inner: 0.613,
                            outer: 0.84
                        )
                        .fill(mono ? Color.white.opacity(z == cur ? 1 : 0.3) : z.color.opacity(z == cur ? 1 : 0.28))
                    }
                }
                if !mono {
                    DialNeedle(angle: today, from: 0.587, to: 0.853)
                        .stroke(Color.white, style: StrokeStyle(lineWidth: size * 5 / 300, lineCap: .round))
                    Circle()
                        .fill(cur.ink)
                        .frame(width: size * 0.547, height: size * 0.547)
                }
                DialPointer(angle: today, tip: 0.847, base: 0.993, half: 6.5)
                    .fill(mono ? Color.white : cur.ink)
                if !mono {
                    DialPointer(angle: today, tip: 0.847, base: 0.993, half: 6.5)
                        .stroke(Color.white, style: StrokeStyle(lineWidth: size * 4 / 300, lineJoin: .round))
                }
                Image(systemName: cur.symbol)
                    .font(.system(size: size * (mono ? 0.3 : 0.24), weight: mono ? .semibold : .regular))
                    .foregroundColor(.white)
            }
            .frame(width: size, height: size)
            .position(x: geo.size.width / 2, y: geo.size.height / 2)
        }
    }
}

// MARK: - Flat hormone chart (medium widget)

private struct HormoneCurve: Shape {
    let points: [(Double, Double)]
    let cycleLength: Int

    /// Smoothstep interpolation between control points (same look as CycleGraph.tsx).
    static func level(_ pts: [(Double, Double)], _ d: Double) -> Double {
        for i in 0..<(pts.count - 1) {
            let a = pts[i], b = pts[i + 1]
            if d <= b.0 {
                let span = b.0 - a.0
                let u = span > 0 ? min(1, max(0, (d - a.0) / span)) : 1
                return a.1 + (b.1 - a.1) * u * u * (3 - 2 * u)
            }
        }
        return pts.last?.1 ?? 0
    }

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let L = Double(cycleLength)
        var t = 0.0
        while t <= L {
            let pt = CGPoint(x: rect.minX + CGFloat(t / L) * rect.width,
                             y: rect.maxY - CGFloat(Self.level(points, t)) * rect.height * 0.92)
            if t == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
            t += 0.25
        }
        return p
    }

    /// Control points (day, level 0…1), anchored on ovulation (L − 14).
    static func estradiol(_ L: Int, _ P: Int) -> [(Double, Double)] {
        let o = Double(L - 14), e = Double(L), p = Double(P)
        return [(0, 0.15), (p * 0.6, 0.10), (p + 1, 0.20), ((p + o) / 2, 0.35), (o - 1, 0.85), (o + 1, 0.45),
                (o + (e - o) * 0.4, 0.62), (e - 2, 0.22), (e, 0.10)]
    }

    static func progesterone(_ L: Int, _ P: Int) -> [(Double, Double)] {
        let o = Double(L - 14), e = Double(L)
        return [(0, 0.08), (o - 1, 0.08), (o + 1, 0.22), (o + (e - o) * 0.5, 0.78), (e - 2, 0.30), (e, 0.05)]
    }
}

struct FlatCycleChart: View {
    let s: PhaseSnapshot

    private struct Band: Identifiable {
        let id: String
        let from: Int
        let to: Int
        let color: Color
        let opacity: Double
    }

    private func bands(_ L: Int) -> [Band] {
        let cur = s.cycleZone
        var out: [Band] = []
        for z in CycleZone.allCases {
            guard let b = z.bounds(cycleLength: L, periodDuration: periodDurationGuess) else { continue }
            let op = z == cur ? 0.3 : 0.1
            if b.1 > L {
                out.append(Band(id: z.rawValue + "-end", from: b.0, to: L, color: z.color, opacity: op))
                out.append(Band(id: z.rawValue + "-start", from: 1, to: b.1 - L, color: z.color, opacity: op))
            } else {
                out.append(Band(id: z.rawValue, from: b.0, to: b.1, color: z.color, opacity: op))
            }
        }
        return out
    }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let L = max(s.cycleLength, 18)
            let x = { (d: Double) -> CGFloat in CGFloat(d / Double(L)) * w }
            let cursorX = x(Double(s.dayInCycle) - 0.5)
            ZStack(alignment: .topLeading) {
                ForEach(bands(L)) { b in
                    Rectangle()
                        .fill(b.color.opacity(b.opacity))
                        .frame(width: x(Double(b.to)) - x(Double(b.from - 1)), height: h)
                        .offset(x: x(Double(b.from - 1)))
                }
                HormoneCurve(points: HormoneCurve.estradiol(L, periodDurationGuess), cycleLength: L)
                    .stroke(hex(0x2D2A26), lineWidth: 1.6)
                HormoneCurve(points: HormoneCurve.progesterone(L, periodDurationGuess), cycleLength: L)
                    .stroke(hex(0x7A6F5E), style: StrokeStyle(lineWidth: 1.6, dash: [3, 2]))
                Rectangle()
                    .fill(s.cycleZone.ink)
                    .frame(width: 1.5, height: h)
                    .offset(x: cursorX - 0.75)
            }
        }
    }
}

// MARK: - Home-screen widgets

private struct OpenAppHint: View {
    var body: some View {
        VStack(spacing: 2) {
            Text("Ouvre HerDays").font(.headline)
            Text("pour activer le suivi").font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct SmallDialView: View {
    let s: PhaseSnapshot
    var body: some View {
        if s.systemState == "unknown" {
            OpenAppHint()
        } else {
            CycleDial(s: s)
        }
    }
}

struct MediumDialView: View {
    let s: PhaseSnapshot
    var body: some View {
        if s.systemState == "unknown" {
            OpenAppHint()
        } else {
            let ink = s.cycleZone.ink
            HStack(spacing: 14) {
                CycleDial(s: s)
                    .frame(width: 132, height: 132)
                VStack(alignment: .leading, spacing: 3) {
                    Text("\(s.zoneLabel.uppercased()) · J\(s.dayInCycle)")
                        .font(.system(size: 9, weight: .medium)).tracking(0.5)
                        .foregroundColor(ink)
                    Text(s.phaseLabel)
                        .font(.system(size: 15, weight: .bold)).foregroundColor(ink)
                        .lineLimit(1).minimumScaleFactor(0.7)
                    Text(s.zoneDaysLeftLabel)
                        .font(.system(size: 11)).foregroundColor(ink)
                    Spacer(minLength: 4)
                    FlatCycleChart(s: s)
                        .frame(height: 56)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
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

private struct WidgetHeader: View {
    let style: PhaseStyle
    let day: Int
    var body: some View {
        HStack {
            HStack(spacing: 5) {
                RoundedRectangle(cornerRadius: 2).fill(style.primary).frame(width: 7, height: 7)
                Text("HERDAYS").font(.system(size: 9, weight: .medium)).tracking(0.6).foregroundColor(.secondary)
            }
            Spacer()
            Text("J\(day)").font(.system(size: 9, weight: .medium)).foregroundColor(.secondary)
        }
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
                Text((s.postureLabel.isEmpty ? "Elle a besoin que tu sois" : s.postureLabel).uppercased()).font(.system(size: 8, weight: .medium)).tracking(0.5).foregroundColor(style.ink.opacity(0.7))
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
                        Text("A AIDÉ").font(.system(size: 8, weight: .medium)).foregroundColor(hex(0x1C6B50))
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
        ZStack {
            AccessoryWidgetBackground()
            if s.systemState == "unknown" {
                Image(systemName: "moon").font(.system(size: 18))
            } else {
                CycleDial(s: s, mono: true).padding(2)
            }
        }
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
        let zoneBackground = s.systemState == "unknown" ? Color.gray.opacity(0.12) : s.cycleZone.background
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
            MediumDialView(s: s).containerBackground(zoneBackground, for: .widget)
        default:
            SmallDialView(s: s).containerBackground(zoneBackground, for: .widget)
        }
    }
}

struct HerDayPhaseWidget: Widget {
    let kind: String = "HerDayPhaseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PhaseProvider()) { entry in
            HerDayWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Cycle HerDays")
        .description("Où on en est dans le cycle : Nuit, Aube, Jour ou Crépuscule.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryInline, .accessoryCircular, .accessoryRectangular,
        ])
    }
}

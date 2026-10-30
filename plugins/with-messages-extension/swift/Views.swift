import Messages
import SwiftUI
import UIKit

// Kismet palette (src/theme/colors.ts): warm off-white canvas, plum ink, coral as the one accent, hairlines.
private func dynamic(_ light: UInt32, _ dark: UInt32, alpha: CGFloat = 1) -> Color {
  func ui(_ hex: UInt32) -> UIColor {
    UIColor(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: alpha)
  }
  return Color(UIColor { $0.userInterfaceStyle == .dark ? ui(dark) : ui(light) })
}

extension Color {
  static let kCoral = Color(red: 1, green: 0.310, blue: 0.427)
  static let kBackground = dynamic(0xFFFBF7, 0x1A0F22)
  static let kFill = dynamic(0xF6EEE7, 0x2A1D33)
  static let kCard = dynamic(0xFFFFFF, 0x221629)
  static let kInk = dynamic(0x1A0F22, 0xFFF7F0)
  static let kOnInk = dynamic(0xFFF7F0, 0x1A0F22)
  static let kMuted = dynamic(0x7A6E7C, 0xB9A9B5)
  static let kLine = dynamic(0x1A0F22, 0xFFF7F0, alpha: 0.08)
  static let kLineStrong = dynamic(0x1A0F22, 0xFFF7F0, alpha: 0.16)
  static let kSuccess = dynamic(0x2F7D5B, 0x6FCF9F)
}

/// The backend runs for one village and names it (and its place and dates) in some texts; the extension never does, it
/// says "the village". Same rules, in the same order, as villageWording() in src/lib/copy.ts. Links are left as they are.
// Raw strings (#"..."#): a backslash is the regex's own, \#(name) interpolates. villageName is for case-insensitive
// rules, villageCased for rules whose replacement starts with a capital. Neither matches a domain.
private let villageName = #"(?:Edge[ -]?City(?: India)?)\b(?!\.\w)"#
private let villageCased = #"(?:[Ee]dge[ -]?[Cc]ity(?: India)?|EDGE[ -]?CITY(?: INDIA)?)\b(?!\.\w)"#
// The places around it (Goa: its beaches and villages): the constants and rules below are generated from copy.ts
// (SPOT, PLACE, LIST, ORS, PRE, POST, DET, POSS and the place rules, in order; see the comments there) by
// tools/swift-place-rules.cjs. Edit copy.ts, then regenerate.
private let villageSpot = #"(?:[Mm]andrem|MANDREM|[Aa]sh[vw]em|ASH[VW]EM|[Aa]rambol|ARAMBOL|[Mm]orjim|MORJIM|[Aa]njuna|ANJUNA|[Vv]agator|VAGATOR|[Aa]ssag[aã]o|ASSAG[AÃ]O)"#
private let villagePlace = #"(?:\#(villageSpot)|Goa|GOA)"#
private let villageList = #"\#(villageSpot)(?:, (?:[Tt]he )?\#(villageSpot))*,? (?:and|or) (?:[Tt]he )?\#(villageSpot)"#
private let villageOrs = #"\#(villageSpot)(?:, (?:[Tt]he )?\#(villageSpot))*,? or (?:[Tt]he )?\#(villageSpot)"#
private let villagePre = #"(^|[^\w@./#-])"#
private let villagePost = #"(?![\w@]|\.\w|-[A-Z])"#
private let villageDet = #"[Mm]y|[Yy]our|[Oo]ur|[Tt]heir|[Hh]is|[Hh]er|[Ii]ts|[Tt]his|[Ee]very|[Ee]ach|[Ll]ast|[Nn]ext|[Ss]ame|[Ff]ellow|[Oo]ther|[Aa]ll|[Aa]ny|[Ss]ome|[Oo]wn|[Ww]hole|[Ll]ocal|[Qq]uiet|[Ff]avou?rite|[Tt]wo|[Tt]hree|[Ff]our|[Ff]ive|\d+|[Tt]he|[Aa]"#
private let villagePoss = #"(?!(?:[Ii]t|[Tt]hat|[Hh]e|[Ss]he|[Tt]here|[Hh]ere|[Ww]hat|[Ww]ho|[Ww]here|[Ll]et|[Hh]ow|[Ww]hen|[Ww]hy|[Ee]veryone|[Ee]verything|[Nn]ow)['’]s )[A-Za-z]+['’]s"#
private let villageRules: [(String, String)] = [
  // The membership question and its "for now" answer.
  (#"(?i)\b([Aa])re you at \#(villageName)(?: \([^)]*\))?\?"#, "$1re you living in the village right now?"),
  (#"(?i)\bis \#(villageName) only(?= for now|[.,:;!]|$)"#, "is just for village residents"),
  // Its place and dates: "(Mandrem, Goa, Oct 11 - Nov 1 2026)", "in Mandrem, Goa", "Edge City, in North Goa, is".
  (#"(?i)(\#(villageName)(?: residents)?) \((?=[^)]*(?:Mandrem|Goa|Oct 11))[^)]*\)"#, "$1"),
  (#"(?i)(\#(villageName))(?:, in (?:Mandrem, )?(?:North )?Goa\b,?| in (?:Mandrem, )?(?:North )?Goa\b)"#, "$1"),
  // The other villages of the same series.
  (#"(?i)\bEdge (?:City )?(?:Esmeralda|Lanna|Patagonia|Austin|Denver|Bhutan)\b"#, "another village"),
  (#"\b(?:At|In) \#(villageCased)"#, "In the village"),
  (#"(?i)\b(?:at|in) \#(villageName)"#, "in the village"),
  (#"\bThe \#(villageCased)(?: pop-up)?(?: village)?\b"#, "The village"),
  (#"(?i)\bthe \#(villageName)(?: pop-up)?(?: village)?\b"#, "the village"),
  (#"\bAn? \#(villageCased)"#, "A village"),
  (#"(?i)\ban? \#(villageName)"#, "a village"),
  // "your Edge City highlight", "two Edge City veterans", "post-Edge City plans": no "the".
  (#"(?i)(\b(?:my|your|our|their|his|her|its|this|that|first|last|next|fellow|every|each|other|both|all|two|three|four|five|\d+) |-)\#(villageName)"#, "$1village"),
  (#"(?i)(^|[.!?]\s+|\n|["“])\#(villageName)"#, "$1The village"),
  (#"(?i)\b\#(villageName) (residents?|members?|people|builders|folks|crowd|friends|community|weeks?|vibes?|life|days?)\b"#, "village $1"),
  (#"(?i)\b\#(villageName)"#, "the village"),
  // The places around it, bare (agent-written plans and reasons: "a swim at Mandrem Beach", "Mandrem sunsets", "Ashvem,
  // Goa"): "the beach", "the village". After the rules above, which drop "(Mandrem, Goa, ...)" after the village's name.
  // ", Goa" / " in North Goa" after a place or a beach goes (not when a new clause starts: "Mandrem, Goa is busy").
  (#"(\#(villagePlace)|[Bb]each)(?:, in (?:North |South )?(?:Goa|GOA)\#(villagePost),?| in (?:North |South )?(?:Goa|GOA)\#(villagePost)| (?:North |South )?(?:Goa|GOA)\#(villagePost)|, (?:North |South )?(?:Goa|GOA)(?=\s*(?:[.,;:!?)(]|$)|\s+(?:then|and|or|but|for|with|to|on|at|in|near|from|by|after|before|where|which)\b))"#, "$1"),
  (#"\b(?:North|South|NORTH|SOUTH) (Goa|GOA)\#(villagePost)"#, "$1"),
  // "an Anjuna ...": "a" before what it becomes ("a village", "a beach").
  (#"\b([Aa])n (\#(villagePlace)\#(villagePost))"#, "$1 $2"),
  // Lists, while they are still place names: "Anjuna Beach or Vagator beach" is the beach, "Ashvem and Morjim beaches"
  // the beaches, "between Mandrem and Morjim" two villages, "Mandrem or Ashvem" the village, "Mandrem and Ashvem" the
  // villages; after a DET or POSS ("my Mandrem and Ashvem friends") a list reads as "village" too.
  (#"(\#(villageSpot)) (?:[Bb]each|BEACH)(,? (?:and|or) )(?=(?:[Tt]he )?\#(villageSpot) (?:[Bb]each|BEACH))"#, "$1$2"),
  (#"(^|[.!?]\s+|\n|["“])(?:[Tt]he )?\#(villageList) (?:[Bb]each(es)?|BEACH(?:ES)?)\#(villagePost)"#, "$1The beach$2"),
  (#"\b(\#(villageDet)|\#(villagePoss)) \#(villageList) (?:[Bb]each(es)?|BEACH(?:ES)?)\#(villagePost)"#, "$1 beach$2"),
  (#"\#(villagePre)\#(villageList) (?:[Bb]each(es)?|BEACH(?:ES)?)\#(villagePost)"#, "$1the beach$2"),
  (#"\b([Bb]etween) (?:the )?\#(villageSpot) and (?:the )?\#(villageSpot)\#(villagePost)"#, "$1 two villages"),
  (#"(^|[.!?]\s+|\n|["“])\#(villageOrs)\#(villagePost)"#, "$1The village"),
  (#"\b(\#(villageDet)|\#(villagePoss)) \#(villageOrs)\#(villagePost)"#, "$1 village"),
  (#"\#(villagePre)\#(villageOrs)\#(villagePost)"#, "$1the village"),
  (#"(^|[.!?]\s+|\n|["“])\#(villageList)\#(villagePost)"#, "$1The villages"),
  (#"\b(\#(villageDet)|\#(villagePoss)) \#(villageList)\#(villagePost)"#, "$1 village"),
  (#"\#(villagePre)\#(villageList)\#(villagePost)"#, "$1the villages"),
  // One place: its beach is the beach ("a Mandrem Beach sunset": a beach sunset), the place the village.
  (#"(^|[.!?]\s+|\n|["“])(?:[Tt]he )?\#(villagePlace) (?:[Bb]each(es)?|BEACH(?:ES)?)\#(villagePost)"#, "$1The beach$2"),
  (#"\b(\#(villageDet)|\#(villagePoss)) \#(villagePlace) (?:[Bb]each(es)?|BEACH(?:ES)?)\#(villagePost)"#, "$1 beach$2"),
  (#"\#(villagePre)\#(villagePlace) (?:[Bb]each(es)?|BEACH(?:ES)?)\#(villagePost)"#, "$1the beach$2"),
  (#"(^|[.!?]\s+|\n|["“])(?:[Tt]he )?\#(villagePlace)(?: [Vv]illage)?\#(villagePost)"#, "$1The village"),
  (#"\#(villagePre)(?:[Tt]he )?\#(villagePlace) [Vv]illage\#(villagePost)"#, "$1the village"),
  (#"([a-z]-)\#(villagePlace)\#(villagePost)"#, "$1village"),
  (#"\b(\#(villageDet)|\#(villagePoss)) \#(villagePlace)\#(villagePost)"#, "$1 village"),
  (#"\b([Aa]t|[Ii]n) \#(villagePlace)(?=['’]s\b)"#, "$1 the village"),
  (#"\b(?:At|In) \#(villagePlace)\#(villagePost)"#, "In the village"),
  (#"\b(?:at|in) \#(villagePlace)\#(villagePost)"#, "in the village"),
  (#"\#(villagePre)\#(villagePlace) (sunsets?|sunrises?|mornings?|evenings?|nights?|vibes?|life|days?|weeks?|cafes?|shacks?|market|crowd|folks|people|residents?|locals|sand|waves|surf|walks?|swims?|side)\b"#, "$1village $2"),
  (#"\#(villagePre)\#(villagePlace)\#(villagePost)"#, "$1the village"),
]

/// A link to one of the website's pages that has a copy without the village's own name (/waitlist, /join, /support,
/// /privacy, /terms) goes to that copy, /app/... Same rule as appLink() in src/lib/copy.ts.
func appLink(_ url: String) -> String {
  url.replacingOccurrences(
    of: #"^https://(?:kismet-village|agent-dates)\.vercel\.app/(waitlist|join|support|privacy|terms)(?=$|[?#]|[.,;:!)]+$)"#,
    with: "https://kismet-village.vercel.app/app/$1", options: .regularExpression)
}

/// A server or agent text (a reply, a recommendation, a chat) without the village's own name.
func villageWording(_ text: String) -> String {
  func reword(_ s: String) -> String {
    villageRules.reduce(s) { $0.replacingOccurrences(of: $1.0, with: $1.1, options: .regularExpression) }
  }
  var out = ""
  var rest = Substring(text)
  while let link = rest.range(of: #"https?://\S+"#, options: .regularExpression) {
    out += reword(String(rest[..<link.lowerBound])) + appLink(String(rest[link]))
    rest = rest[link.upperBound...]
  }
  return out + reword(String(rest))
}

/// Who a report or block is about.
struct SafetyTarget: Identifiable, Equatable {
  let dateId: String
  let name: String
  let isMatch: Bool
  var id: String { dateId }
}

struct RootView: View {
  @ObservedObject var store: KismetStore
  @State private var reporting: SafetyTarget?
  @State private var blocking: SafetyTarget?

  var body: some View {
    ZStack(alignment: .top) {
      Color.kBackground.ignoresSafeArea()
      content
      if let banner = store.banner {
        BannerView(banner: banner) { store.banner = nil }
          .padding(.horizontal, 16)
          .padding(.top, store.style == .expanded ? 52 : 6)
          .transition(.move(edge: .top).combined(with: .opacity))
          .task(id: banner.id) {
            try? await Task.sleep(nanoseconds: banner.isMatch ? 6_000_000_000 : 4_000_000_000)
            if store.banner == banner { withAnimation { store.banner = nil } }
          }
      }
    }
    .animation(.easeInOut(duration: 0.2), value: store.banner)
    .tint(.kInk)
    .environment(\.safety, SafetyActions(
      report: { target in
        store.host.expand()
        reporting = target
      },
      block: { target in blocking = target }
    ))
    .sheet(item: $reporting) { target in
      ReportSheet(target: target, store: store)
    }
    .confirmationDialog(blocking.map { "Block \($0.name)?" } ?? "", isPresented: Binding(
      get: { blocking != nil }, set: { if !$0 { blocking = nil } }
    ), titleVisibility: .visible, presenting: blocking) { target in
      Button("Block \(target.name)", role: .destructive) {
        Task { await store.block(dateId: target.dateId, name: target.name) }
      }
    } message: { _ in
      Text("You won't see each other on Kismet again. They are not told.")
    }
  }

  @ViewBuilder private var content: some View {
    switch store.phase {
    case .loading:
      ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
    case .signedOut:
      SignedOutView { store.host.open(KismetConfig.appURL) }
    case let .failed(message):
      MessageView(title: "Couldn't load your recommendations", message: message, button: "Try again") { store.refresh() }
    case .ready:
      if store.style == .expanded {
        ExpandedView(store: store)
      } else {
        CompactView(store: store)
      }
    }
  }
}

// MARK: - Safety actions available to every card

struct SafetyActions {
  var report: (SafetyTarget) -> Void = { _ in }
  var block: (SafetyTarget) -> Void = { _ in }
}

private struct SafetyKey: EnvironmentKey {
  static let defaultValue = SafetyActions()
}

extension EnvironmentValues {
  var safety: SafetyActions {
    get { self[SafetyKey.self] }
    set { self[SafetyKey.self] = newValue }
  }
}

struct SafetyMenu: View {
  let target: SafetyTarget
  @Environment(\.safety) private var safety

  var body: some View {
    Menu {
      Button(role: .destructive) { safety.report(target) } label: {
        Label("Report \(target.name)", systemImage: "exclamationmark.bubble")
      }
      Button(role: .destructive) { safety.block(target) } label: {
        Label("Block \(target.name)", systemImage: "hand.raised")
      }
    } label: {
      Image(systemName: "ellipsis")
        .font(.system(size: 17, weight: .semibold))
        .foregroundStyle(Color.kMuted)
        .frame(width: 44, height: 44)
        .contentShape(Rectangle())
    }
    .accessibilityLabel("Report or block \(target.name)")
  }
}

// MARK: - Round Pass / Yes buttons (Hinge-style)

struct RoundButton: View {
  let yes: Bool
  let label: String
  var size: CGFloat = 60
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Image(systemName: yes ? "checkmark" : "xmark")
        .font(.system(size: yes ? size * 0.4 : size * 0.34, weight: .semibold))
        .foregroundStyle(yes ? Color.white : Color.kInk)
        .frame(width: size, height: size)
        .background(Circle().fill(yes ? Color.kCoral : Color.kCard))
        .overlay(Circle().stroke(yes ? Color.clear : Color.kLineStrong, lineWidth: 1))
        .shadow(color: Color.black.opacity(0.08), radius: 8, y: 2)
    }
    .buttonStyle(PressScale())
    .accessibilityLabel(label)
  }
}

/// Pass / Yes. Answers are final, so each one is confirmed first (like the app's Home).
struct DecisionRow: View {
  let rec: Recommendation
  let decide: (Bool) -> Void
  @State private var asking: Bool?
  /// The last answer asked about, kept while the dialog animates away so its title doesn't flip.
  @State private var lastAsked = true

  var body: some View {
    HStack {
      RoundButton(yes: false, label: "Pass on \(rec.firstName)") { ask(false) }
      Spacer()
      Text("Private until you both say yes")
        .font(.footnote)
        .foregroundStyle(Color.kMuted)
        .multilineTextAlignment(.center)
      Spacer()
      RoundButton(yes: true, label: "Yes to \(rec.firstName)") { ask(true) }
    }
    .confirmationDialog(
      lastAsked ? "Say yes to \(rec.firstName)?" : "Pass on \(rec.firstName)?",
      isPresented: Binding(get: { asking != nil }, set: { if !$0 { asking = nil } }),
      titleVisibility: .visible,
      presenting: asking
    ) { yes in
      Button(yes ? "Yes, I'd meet" : "Pass") { decide(yes) }
      Button("Cancel", role: .cancel) {}
    } message: { yes in
      Text(yes ? "Answers are final. \(rec.firstName) only hears about it if they say yes too." : "Answers are final. \(rec.firstName) is never told.")
    }
  }

  private func ask(_ yes: Bool) {
    lastAsked = yes
    asking = yes
  }
}

struct PressScale: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.94 : 1)
      .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

// MARK: - Compact: one person, Pass / Yes

struct CompactView: View {
  @ObservedObject var store: KismetStore

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 8) {
        Image("KismetMark").resizable().scaledToFit().frame(width: 20, height: 20).accessibilityHidden(true)
        Text(store.recommendations.isEmpty ? "Kismet" : "\(store.recommendations.count) from your agent")
          .font(.system(size: 14, weight: .medium))
          .foregroundStyle(Color.kMuted)
        Spacer()
        Button { store.host.expand() } label: {
          HStack(spacing: 4) {
            Text(store.matches.isEmpty ? "See all" : "Matches \(store.matches.count)")
            Image(systemName: "chevron.up")
          }
          .font(.system(size: 14, weight: .medium))
          .foregroundStyle(Color.kInk)
        }
        .accessibilityLabel("Show all recommendations and matches")
      }
      if let rec = store.recommendations.first {
        HStack(alignment: .top, spacing: 14) {
          PersonPhoto(url: rec.photos.first, name: rec.name, api: store.api, size: 76, radius: 16)
          VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
              Text(rec.firstName)
                .font(.serifTitle(28))
                .foregroundStyle(Color.kInk)
                .lineLimit(1)
              Spacer(minLength: 0)
              SafetyMenu(target: SafetyTarget(dateId: rec.dateId, name: rec.firstName, isMatch: false))
                .padding(.vertical, -12)
                .padding(.trailing, -10)
            }
            Text(villageWording(rec.why))
              .font(.system(size: 15))
              .foregroundStyle(Color.kInk.opacity(0.8))
              .lineLimit(2)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .id(rec.dateId)
        .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))
        // .id: a different person gets a fresh row, so an open confirmation never answers someone else.
        DecisionRow(rec: rec) { yes in store.decide(rec, yes: yes) }
          .id(rec.dateId)
      } else {
        EmptyRecsView { store.host.invite() }
      }
    }
    .padding(.horizontal, 20)
    .padding(.top, 14)
    .padding(.bottom, 8)
    .frame(maxHeight: .infinity, alignment: .top)
  }
}

struct EmptyRecsView: View {
  let invite: () -> Void

  var body: some View {
    VStack(spacing: 12) {
      Text("Your agent is out meeting people. Check back soon.")
        .font(.serifText(22))
        .foregroundStyle(Color.kInk)
        .multilineTextAlignment(.center)
      Button(action: invite) {
        Text("Invite a friend")
          .font(.system(size: 15, weight: .medium))
          .foregroundStyle(Color.kInk)
          .padding(.horizontal, 18)
          .frame(minHeight: 40)
          .overlay(Capsule().stroke(Color.kLineStrong, lineWidth: 1))
      }
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 16)
  }
}

// MARK: - Expanded: a profile to scroll, the rest, matches, invite

struct ExpandedView: View {
  @ObservedObject var store: KismetStore
  @State private var focusId: String?

  private var focused: Recommendation? {
    store.recommendations.first { $0.dateId == focusId } ?? store.recommendations.first
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 28) {
          if let rec = focused {
            VStack(alignment: .leading, spacing: 14) {
              ProfileView(rec: rec, api: store.api)
                .id(rec.dateId)
                .transition(.opacity)
              DecisionRow(rec: rec) { yes in
                focusId = nil
                store.decide(rec, yes: yes)
              }
              .id(rec.dateId)
              .padding(.top, 4)
            }
          } else {
            EmptyRecsView { store.host.invite() }
          }

          let others = store.recommendations.filter { $0.dateId != focused?.dateId }
          if !others.isEmpty {
            ListSection(title: "Also recommended") {
              ForEach(others) { r in
                Button { withAnimation { focusId = r.dateId } } label: {
                  PersonRow(name: r.name, detail: villageWording(r.why), photo: r.photos.first, api: store.api, badge: nil)
                }
                .buttonStyle(.plain)
              }
            }
          }

          ListSection(title: "Matches") {
            if store.matches.isEmpty {
              Text("No matches yet. A match needs both agents and both of you to say yes.")
                .font(.subheadline)
                .foregroundStyle(Color.kMuted)
                .padding(.vertical, 12)
            }
            ForEach(store.matches) { m in
              NavigationLink(value: m) {
                PersonRow(name: m.name, detail: m.external?.label ?? "Message in Kismet", photo: m.photos?.first, api: store.api, badge: m.unread)
              }
              .buttonStyle(.plain)
            }
          }

          VStack(spacing: 6) {
            Button { store.host.invite() } label: {
              Label("Invite a friend", systemImage: "paperplane")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(Capsule().fill(Color.kCoral))
            }
            .buttonStyle(PressScale())
            Button { store.host.open(KismetConfig.appURL) } label: {
              Text("Open Kismet").font(.system(size: 15)).underline().foregroundStyle(Color.kInk).frame(minHeight: 44)
            }
          }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 32)
      }
      .refreshable { await store.load() }
      .background(Color.kBackground)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .principal) {
          HStack(spacing: 6) {
            Image("KismetMark").resizable().scaledToFit().frame(width: 20, height: 20)
            Text("Kismet").font(.serifTitle(19, relativeTo: .headline)).foregroundStyle(Color.kInk)
          }
          .accessibilityElement(children: .combine)
        }
      }
      .navigationDestination(for: Match.self) { match in
        MatchDetail(match: match, store: store)
      }
    }
  }
}

/// A recommendation as a Hinge-style profile: serif name, a 4:5 photo or monogram, then prompt cards.
struct ProfileView: View {
  let rec: Recommendation
  let api: KismetAPI?

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 4) {
          Text(rec.name).font(.serifTitle(34)).foregroundStyle(Color.kInk)
          HStack(spacing: 10) {
            Text("In the village").font(.subheadline).foregroundStyle(Color.kMuted)
            if rec.worldVerified {
              Text("✓ Verified").font(.subheadline.weight(.medium)).foregroundStyle(Color.kSuccess)
            }
          }
        }
        Spacer(minLength: 0)
        SafetyMenu(target: SafetyTarget(dateId: rec.dateId, name: rec.firstName, isMatch: false))
          .padding(.trailing, -10)
      }
      PersonPhoto(url: rec.photos.first, name: rec.name, api: api, size: nil, radius: 18)
        .aspectRatio(4 / 5, contentMode: .fit)
        .frame(maxWidth: .infinity)
      if !rec.why.isEmpty { PromptCard(label: "Why your agent liked them", text: villageWording(rec.why)) }
      if let bio = rec.summary, !bio.isEmpty { PromptCard(label: "In their words", text: villageWording(bio)) }
      if let meetup = rec.meetup, !meetup.isEmpty { PromptCard(label: "Where you'd meet", text: villageWording(meetup)) }
      if !rec.sharedInterests.isEmpty {
        VStack(alignment: .leading, spacing: 12) {
          Text("You both like").font(.footnote.weight(.medium)).foregroundStyle(Color.kMuted)
          FlowChips(items: rec.sharedInterests)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color.kCard))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Color.kLine, lineWidth: 1))
      }
    }
  }
}

struct PromptCard: View {
  let label: String
  let text: String

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(label).font(.footnote.weight(.medium)).foregroundStyle(Color.kMuted)
      Text(text).font(.serifText(22)).foregroundStyle(Color.kInk).fixedSize(horizontal: false, vertical: true)
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 22)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color.kCard))
    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Color.kLine, lineWidth: 1))
  }
}

struct FlowChips: View {
  let items: [String]

  var body: some View {
    // Interests are few and short: wrap them in rows of up to three.
    VStack(alignment: .leading, spacing: 8) {
      ForEach(Array(stride(from: 0, to: items.count, by: 3)), id: \.self) { start in
        HStack(spacing: 8) {
          ForEach(items[start ..< min(start + 3, items.count)], id: \.self) { item in
            Text(item)
              .font(.subheadline)
              .foregroundStyle(Color.kInk)
              .padding(.horizontal, 12)
              .padding(.vertical, 5)
              .overlay(Capsule().stroke(Color.kLineStrong, lineWidth: 1))
          }
        }
      }
    }
  }
}

struct ListSection<Content: View>: View {
  let title: String
  @ViewBuilder let content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(title.uppercased())
        .font(.caption.weight(.semibold))
        .kerning(1)
        .foregroundStyle(Color.kMuted)
        .padding(.bottom, 6)
      Rectangle().fill(Color.kLine).frame(height: 1)
      content
    }
  }
}

struct PersonRow: View {
  let name: String
  let detail: String
  let photo: String?
  let api: KismetAPI?
  let badge: Int?

  var body: some View {
    HStack(spacing: 14) {
      PersonPhoto(url: photo, name: name, api: api, size: 52, radius: 26)
      VStack(alignment: .leading, spacing: 2) {
        Text(name).font(.serifTitle(20, relativeTo: .headline)).foregroundStyle(Color.kInk).lineLimit(1)
        if !detail.isEmpty {
          Text(detail).font(.subheadline).foregroundStyle(Color.kMuted).lineLimit(1)
        }
      }
      Spacer(minLength: 0)
      if let badge, badge > 0 {
        Text("\(badge)")
          .font(.caption.bold())
          .foregroundStyle(.white)
          .padding(.horizontal, 7)
          .padding(.vertical, 2)
          .background(Capsule().fill(Color.kCoral))
          .accessibilityLabel("\(badge) unread")
      }
      Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Color.kMuted)
    }
    .padding(.vertical, 14)
    .contentShape(Rectangle())
    .overlay(alignment: .bottom) { Rectangle().fill(Color.kLine).frame(height: 1) }
  }
}

struct MatchDetail: View {
  let match: Match
  @ObservedObject var store: KismetStore

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        VStack(spacing: 10) {
          PersonPhoto(url: match.photos?.first, name: match.name, api: store.api, size: 104, radius: 52)
          Text("You and \(match.firstName) matched").font(.serifTitle(28)).foregroundStyle(Color.kInk).multilineTextAlignment(.center)
          Text("Both agents recommended it and you both said yes.")
            .font(.subheadline).foregroundStyle(Color.kMuted).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)

        VStack(spacing: 10) {
          if let ext = match.external {
            Button { store.host.open(ext.url) } label: {
              Text("Message \(match.firstName) on \(ext.service)")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(Capsule().fill(Color.kCoral))
            }
            .buttonStyle(PressScale())
          }
          if let url = URL(string: "kismet://messages/\(match.dateId)") {
            Button { store.host.open(url) } label: {
              Text("Chat in Kismet")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Color.kInk)
                .frame(maxWidth: .infinity, minHeight: 52)
                .overlay(Capsule().stroke(Color.kLineStrong, lineWidth: 1))
            }
            .buttonStyle(PressScale())
          }
        }

        if match.kind == "romance", match.relationshipStatus != nil || match.openTo != nil {
          if let s = match.relationshipStatus, !s.isEmpty { PromptCard(label: "Relationship", text: s) }
          if let o = match.openTo, !o.isEmpty { PromptCard(label: "Open to", text: o) }
        }

        if let lines = match.transcript, !lines.isEmpty {
          ListSection(title: "How your agents' chat went") {
            VStack(alignment: .leading, spacing: 10) {
              ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                let mine = line.who == "mine"
                VStack(alignment: .leading, spacing: 3) {
                  Text(mine ? (match.myAgentName ?? "Your agent") : (match.theirAgentName ?? "Their agent"))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(mine ? Color.kOnInk.opacity(0.7) : Color.kMuted)
                  Text(villageWording(line.text)).font(.subheadline).foregroundStyle(mine ? Color.kOnInk : Color.kInk)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(mine ? Color.kInk : Color.kCard))
                .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(mine ? Color.clear : Color.kLine, lineWidth: 1))
                .frame(maxWidth: .infinity, alignment: mine ? .trailing : .leading)
                .padding(mine ? .leading : .trailing, 36)
              }
            }
            .padding(.top, 12)
          }
        }

        SafetyRow(target: SafetyTarget(dateId: match.dateId, name: match.firstName, isMatch: true))
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 16)
    }
    .background(Color.kBackground)
    .navigationTitle(match.firstName)
    .navigationBarTitleDisplayMode(.inline)
  }
}

struct SafetyRow: View {
  let target: SafetyTarget
  @Environment(\.safety) private var safety

  var body: some View {
    HStack(spacing: 20) {
      Button(role: .destructive) { safety.report(target) } label: { Text("Report \(target.name)").underline() }
      Button(role: .destructive) { safety.block(target) } label: { Text("Block \(target.name)").underline() }
    }
    .font(.subheadline)
    .foregroundStyle(Color.kMuted)
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Report sheet

struct ReportSheet: View {
  let target: SafetyTarget
  @ObservedObject var store: KismetStore
  @Environment(\.dismiss) private var dismiss
  @State private var reason = "harassment"
  @State private var note = ""
  @State private var sending = false

  private let reasons: [(String, String)] = [
    ("harassment", "Harassment"),
    ("spam", "Spam"),
    ("fake", "Fake profile"),
    ("inappropriate", "Inappropriate"),
    ("other", "Something else"),
  ]

  var body: some View {
    NavigationStack {
      Form {
        Section {
          Text("Reports are reviewed by a person, and \(target.name) is blocked for you right away. They are not told who reported them.")
            .font(.subheadline)
            .foregroundStyle(Color.kMuted)
        }
        Section {
          Picker("Reason", selection: $reason) {
            ForEach(reasons, id: \.0) { Text($0.1).tag($0.0) }
          }
          .pickerStyle(.inline)
          .labelsHidden()
        } header: { Text("What happened?") }
        Section {
          TextField("Anything that helps us review it (optional)", text: $note, axis: .vertical)
            .lineLimit(3 ... 6)
            .onChange(of: note) { if $0.count > 500 { note = String($0.prefix(500)) } }
        }
      }
      .navigationTitle("Report \(target.name)")
      .navigationBarTitleDisplayMode(.inline)
      .tint(.kCoral)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button(sending ? "Sending…" : "Report") {
            sending = true
            Task {
              let ok = await store.report(dateId: target.dateId, name: target.name, isMatch: target.isMatch, reason: reason, note: note)
              sending = false
              if ok { dismiss() }
            }
          }
          .disabled(sending)
          .fontWeight(.semibold)
        }
      }
    }
  }
}

// MARK: - Shared pieces

struct BannerView: View {
  let banner: KismetStore.Banner
  let close: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: banner.isMatch ? "person.2.fill" : "info.circle")
        .font(.system(size: 18, weight: .semibold))
        .foregroundStyle(banner.isMatch ? Color.kCoral : Color.kOnInk)
      Text(banner.text)
        .font(.system(size: 15, weight: .medium))
        .foregroundStyle(Color.kOnInk)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(14)
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.kInk))
    .onTapGesture(perform: close)
    .accessibilityAddTraits(.isButton)
  }
}

struct SignedOutView: View {
  let openApp: () -> Void

  var body: some View {
    VStack(spacing: 14) {
      Image("KismetMark")
        .resizable()
        .scaledToFit()
        .frame(width: 44, height: 44)
        .accessibilityHidden(true)
      Text("See who your agent recommends, right here in Messages.")
        .font(.serifText(21))
        .foregroundStyle(Color.kInk)
        .multilineTextAlignment(.center)
      Button(action: openApp) {
        Text("Open Kismet to sign in")
          .font(.system(size: 17, weight: .semibold))
          .frame(maxWidth: .infinity, minHeight: 52)
          .foregroundStyle(.white)
          .background(Capsule().fill(Color.kCoral))
      }
      .buttonStyle(PressScale())
    }
    .padding(24)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct MessageView: View {
  let title: String
  let message: String
  let button: String
  let action: () -> Void

  var body: some View {
    VStack(spacing: 8) {
      Text(title).font(.serifTitle(22)).foregroundStyle(Color.kInk).multilineTextAlignment(.center)
      Text(message).font(.subheadline).foregroundStyle(Color.kMuted).multilineTextAlignment(.center)
      Button(button, action: action).buttonStyle(.bordered).padding(.top, 4)
    }
    .padding(20)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

/// A private photo (needs the viewer's token), or a serif monogram on a cream block.
/// `size` nil: fills the width it is given (profiles).
struct PersonPhoto: View {
  let url: String?
  let name: String
  let api: KismetAPI?
  let size: CGFloat?
  var radius: CGFloat = 16
  @State private var image: UIImage?

  private static let cache = NSCache<NSString, UIImage>()

  var body: some View {
    GeometryReader { geo in
      ZStack {
        if let image {
          Image(uiImage: image).resizable().scaledToFill()
        } else {
          Color.kFill
          Text(String(name.prefix(1)).uppercased())
            .font(.custom("Fraunces-SemiBold", size: max(18, min(geo.size.width, geo.size.height) * 0.42)))
            .foregroundStyle(Color.kInk)
        }
      }
      .frame(width: geo.size.width, height: geo.size.height)
      .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
    .task(id: url) {
      _ = KismetFonts.registered
      guard let url, let u = URL(string: url), let api else { image = nil; return }
      if let hit = Self.cache.object(forKey: url as NSString) { image = hit; return }
      if let img = await api.image(u) {
        Self.cache.setObject(img, forKey: url as NSString)
        image = img
      }
    }
  }
}

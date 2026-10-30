import Messages
import SwiftUI
import UIKit

/// What the SwiftUI views can ask of the Messages host.
struct HostActions {
  var expand: () -> Void = {}
  var compact: () -> Void = {}
  var open: (URL) -> Void = { _ in }
  var invite: () -> Void = {}
}

@MainActor
final class KismetStore: ObservableObject {
  enum Phase: Equatable {
    case loading
    case signedOut
    case failed(String)
    case ready
  }

  struct Banner: Identifiable, Equatable {
    let id = UUID()
    let text: String
    let isMatch: Bool
  }

  @Published var phase: Phase = .loading
  @Published var recommendations: [Recommendation] = []
  @Published var matches: [Match] = []
  @Published var running = 0
  @Published var style: MSMessagesAppPresentationStyle = .compact
  @Published var banner: Banner?
  @Published private(set) var token: String?

  var host = HostActions()
  private var loadTask: Task<Void, Never>?

  var api: KismetAPI? { token.map { KismetAPI(token: $0) } }

  func refresh() {
    loadTask?.cancel()
    loadTask = Task { await load() }
  }

  func load() async {
    guard let token = TokenStore.read() else {
      self.token = nil
      phase = .signedOut
      return
    }
    self.token = token
    if recommendations.isEmpty && matches.isEmpty { phase = .loading }
    do {
      let api = KismetAPI(token: token)
      async let full = api.me()
      async let pending = api.pendingRecommendations()
      let me = try await full
      // Prefer GET /api/me/recommendations (the extension's own list) when it is deployed; it has no bio, so take
      // that from the full view.
      if let list = try? await pending {
        let bios = Dictionary(me.recommendations.map { ($0.dateId, $0.summary) }, uniquingKeysWith: { a, _ in a })
        recommendations = list.map { r in
          var r = r
          if r.summary == nil { r.summary = bios[r.dateId] ?? nil }
          return r
        }
      } else {
        recommendations = me.recommendations
      }
      matches = me.matches
      running = me.running ?? 0
      phase = .ready
    } catch KismetError.signedOut {
      self.token = nil
      phase = .signedOut
    } catch {
      if Task.isCancelled { return }
      if recommendations.isEmpty && matches.isEmpty {
        phase = .failed(error.localizedDescription)
      } else {
        show(error.localizedDescription)
      }
    }
  }

  /// Answers are final (DecisionRow confirms first). The card leaves at once; a mutual yes comes back as a match.
  func decide(_ rec: Recommendation, yes: Bool) {
    guard let api else { return }
    if yes {
      UINotificationFeedbackGenerator().notificationOccurred(.success)
    } else {
      UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }
    let index = recommendations.firstIndex(of: rec)
    withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
      recommendations.removeAll { $0.dateId == rec.dateId }
    }
    Task {
      do {
        let r = try await api.decide(rec.dateId, yes: yes)
        if r.match == true {
          UINotificationFeedbackGenerator().notificationOccurred(.success)
          let handle = r.matchWith?.external.map { " Say hi: \($0.label)." } ?? " Say hi in the Kismet app."
          banner = Banner(text: "You and \(r.matchWith?.name ?? rec.firstName) both said yes!\(handle)", isMatch: true)
          await load()
        }
      } catch {
        withAnimation {
          let at = min(index ?? 0, recommendations.count)
          if !recommendations.contains(rec) { recommendations.insert(rec, at: at) }
        }
        show(error.localizedDescription)
      }
    }
  }

  func report(dateId: String, name: String, isMatch: Bool, reason: String, note: String) async -> Bool {
    guard let api else { return false }
    do {
      let r = try await api.report(dateId, isMatch: isMatch, reason: reason, note: note)
      remove(dateId)
      show(r.text ?? "Thanks. \(name) is blocked for you and a person will review the report.")
      return true
    } catch let KismetError.gone(text) {
      remove(dateId)
      show(text)
      return true
    } catch {
      show(error.localizedDescription)
      return false
    }
  }

  func block(dateId: String, name: String) async {
    guard let api else { return }
    do {
      let r = try await api.block(dateId)
      remove(dateId)
      show(r.text ?? "Blocked \(name). They are not told.")
    } catch let KismetError.gone(text) {
      remove(dateId)
      show(text)
    } catch {
      show(error.localizedDescription)
    }
  }

  private func remove(_ dateId: String) {
    withAnimation {
      recommendations.removeAll { $0.dateId == dateId }
      matches.removeAll { $0.dateId == dateId }
    }
  }

  func show(_ text: String) {
    banner = Banner(text: villageWording(text), isMatch: false)
  }
}

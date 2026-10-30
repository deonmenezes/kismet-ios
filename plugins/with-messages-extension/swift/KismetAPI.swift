import Foundation
import Security
import UIKit

/// Values the config plugin writes into the extension's Info.plist (from app.json).
enum KismetConfig {
  private static func string(_ key: String, _ fallback: String) -> String {
    (Bundle.main.object(forInfoDictionaryKey: key) as? String).flatMap { $0.isEmpty ? nil : $0 } ?? fallback
  }

  static let apiURL = URL(string: string("KismetAPIURL", "https://agent-dates.vercel.app"))!
  static let joinURL = URL(string: string("KismetJoinURL", "https://kismet-village.vercel.app/app/join"))!
  static let appURL = URL(string: string("KismetAppURL", "kismet://"))!
  static let keychainGroup = string("KismetKeychainGroup", "")
  static let version = string("CFBundleShortVersionString", "1.0.0")
}

/// Reads the sign-in token the Kismet app saved with expo-secure-store into the shared keychain access group.
/// expo-secure-store (SecureStoreModule.swift) stores a generic password with service "app:no-auth"
/// (or the legacy "app") and the key's UTF-8 bytes as the account.
enum TokenStore {
  static let key = "agent_dates_token"

  static func read() -> String? {
    for service in ["app:no-auth", "app"] {
      var query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecAttrAccount as String: Data(key.utf8),
        kSecMatchLimit as String: kSecMatchLimitOne,
        kSecReturnData as String: kCFBooleanTrue as Any,
      ]
      if !KismetConfig.keychainGroup.isEmpty { query[kSecAttrAccessGroup as String] = KismetConfig.keychainGroup }
      var item: CFTypeRef?
      if SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data,
         let token = String(data: data, encoding: .utf8), !token.isEmpty {
        return token
      }
    }
    return nil
  }
}

// MARK: - Response shapes (agent-dates src/lib/views.ts, secret.ts: GET /api/me?full=1)

struct MyAgentVerdict: Decodable, Hashable {
  let score: Double?
  let reason: String
  let suggestedMeetup: String?
}

/// A recommendation from GET /api/me/recommendations ({dateId, name, why, meetup, photoUrl, ...}) or from
/// GET /api/me?full=1 ({dateId, name, summary, myAgent: {reason, suggestedMeetup}, photos, ...}).
struct Recommendation: Decodable, Identifiable, Hashable {
  let dateId: String
  let name: String
  var summary: String?
  let sharedInterests: [String]
  let why: String
  let meetup: String?
  let worldVerified: Bool
  let photos: [String]

  var id: String { dateId }
  var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }

  private enum Keys: String, CodingKey {
    case dateId, name, summary, sharedInterests, myAgent, why, meetup, worldVerified, photos, photoUrl
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: Keys.self)
    dateId = try c.decode(String.self, forKey: .dateId)
    name = try c.decode(String.self, forKey: .name)
    summary = try c.decodeIfPresent(String.self, forKey: .summary)
    sharedInterests = try c.decodeIfPresent([String].self, forKey: .sharedInterests) ?? []
    let agent = try c.decodeIfPresent(MyAgentVerdict.self, forKey: .myAgent)
    why = try c.decodeIfPresent(String.self, forKey: .why) ?? agent?.reason ?? ""
    meetup = try c.decodeIfPresent(String.self, forKey: .meetup) ?? agent?.suggestedMeetup
    worldVerified = try c.decodeIfPresent(Bool.self, forKey: .worldVerified) ?? false
    if let list = try c.decodeIfPresent([String].self, forKey: .photos) {
      photos = list
    } else if let one = try c.decodeIfPresent(String.self, forKey: .photoUrl) {
      photos = [one]
    } else {
      photos = []
    }
  }
}

struct RecommendationsResponse: Decodable {
  let recommendations: [Recommendation]
}

struct TranscriptLine: Decodable, Hashable {
  let who: String
  let text: String
}

/// How a match is reached: kind "telegram", "phone" (WhatsApp) or "app" (only a message in Kismet, no link).
struct Contact: Decodable, Hashable {
  let kind: String
  let value: String
  let link: String?
}

/// A match's Telegram or WhatsApp, or nil when they chose neither. Never a bare "https://t.me/" from an empty handle.
struct ExternalContact {
  let label: String
  let service: String
  let url: URL

  init?(telegram: String?, link: String?, contact: Contact?) {
    if let c = contact {
      guard !c.value.isEmpty, let u = ExternalContact.https(c.link) else { return nil }
      if c.kind == "phone" {
        label = "WhatsApp \(c.value)"
        service = "WhatsApp"
      } else if c.kind == "telegram" {
        label = "@\(c.value) on Telegram"
        service = "Telegram"
      } else {
        return nil
      }
      url = u
      return
    }
    var handle = (telegram ?? "").trimmingCharacters(in: .whitespaces)
    if handle.hasPrefix("@") { handle.removeFirst() }
    guard !handle.isEmpty, let u = ExternalContact.https(link) ?? URL(string: "https://t.me/\(handle)") else { return nil }
    label = "@\(handle) on Telegram"
    service = "Telegram"
    url = u
  }

  private static func https(_ s: String?) -> URL? {
    guard let s, s.hasPrefix("https://"), !s.contains(" "), let u = URL(string: s), u.host != nil else { return nil }
    return u
  }
}

struct Match: Decodable, Identifiable, Hashable {
  let dateId: String
  let name: String
  let telegram: String?
  let link: String?
  let contact: Contact?
  let matchedAt: String?
  let kind: String?
  let relationshipStatus: String?
  let openTo: String?
  let myAgentName: String?
  let theirAgentName: String?
  let transcript: [TranscriptLine]?
  let worldVerified: Bool?
  let photos: [String]?
  let unread: Int?

  var id: String { dateId }
  var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }
  var external: ExternalContact? { ExternalContact(telegram: telegram, link: link, contact: contact) }
}

struct MeResponse: Decodable {
  let running: Int?
  let recommendations: [Recommendation]
  let matches: [Match]
}

struct DecideResponse: Decodable {
  struct With: Decodable {
    let name: String
    let telegram: String?
    let link: String?
    let contact: Contact?
    var external: ExternalContact? { ExternalContact(telegram: telegram, link: link, contact: contact) }
  }
  let match: Bool?
  let matchWith: With?
  let text: String?
}

struct TextResponse: Decodable {
  let ok: Bool?
  let text: String?
  let error: String?
}

enum KismetError: LocalizedError {
  case signedOut
  case notFound
  /// The recommendation or match is no longer there (410), with the backend's text.
  case gone(String)
  case offline
  case server(String)

  var errorDescription: String? {
    switch self {
    case .signedOut: return "You're signed out. Open Kismet to sign in."
    case .notFound: return "Not found."
    case let .gone(text): return villageWording(text)
    case .offline: return "Can't reach Kismet. Check your connection and try again."
    case let .server(text): return villageWording(text)
    }
  }
}

// MARK: - Client

struct KismetAPI {
  let token: String

  static let session: URLSession = {
    let c = URLSessionConfiguration.default
    c.timeoutIntervalForRequest = 20
    c.requestCachePolicy = .reloadIgnoringLocalCacheData
    return URLSession(configuration: c)
  }()

  func request(_ path: String, method: String = "GET", body: [String: Any]? = nil) -> URLRequest {
    var base = KismetConfig.apiURL.absoluteString
    while base.hasSuffix("/") { base.removeLast() }
    var r = URLRequest(url: URL(string: base + path)!)
    r.httpMethod = method
    r.setValue("application/json", forHTTPHeaderField: "Accept")
    r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    r.setValue("imessage/\(KismetConfig.version)", forHTTPHeaderField: "X-Kismet-Client")
    if let body {
      r.setValue("application/json", forHTTPHeaderField: "Content-Type")
      r.httpBody = try? JSONSerialization.data(withJSONObject: body)
    }
    return r
  }

  func send<T: Decodable>(_ req: URLRequest, as _: T.Type) async throws -> T {
    let data: Data
    let response: URLResponse
    do {
      (data, response) = try await Self.session.data(for: req)
    } catch {
      throw KismetError.offline
    }
    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    if status == 401 { throw KismetError.signedOut }
    if status == 404 || status == 405 { throw KismetError.notFound }
    guard (200 ..< 300).contains(status) else {
      let msg = (try? JSONDecoder().decode(TextResponse.self, from: data)).flatMap { $0.text ?? $0.error }
      if status == 410 { throw KismetError.gone(msg ?? "They're no longer on Kismet.") }
      throw KismetError.server(msg ?? (status == 429 ? "Slow down a little and try again later." : "Something went wrong (\(status))."))
    }
    return try JSONDecoder().decode(T.self, from: data)
  }

  func me() async throws -> MeResponse {
    try await send(request("/api/me?full=1"), as: MeResponse.self)
  }

  /// The extension's own list (marks them as shown on this channel). nil while the route is not deployed yet.
  func pendingRecommendations() async throws -> [Recommendation]? {
    do {
      return try await send(request("/api/me/recommendations"), as: RecommendationsResponse.self).recommendations
    } catch KismetError.notFound {
      return nil
    }
  }

  func decide(_ dateId: String, yes: Bool) async throws -> DecideResponse {
    try await send(request("/api/me/decide", method: "POST", body: ["dateId": dateId, "decision": yes ? "meet" : "pass"]), as: DecideResponse.self)
  }

  func report(_ dateId: String, isMatch: Bool, reason: String, note: String) async throws -> TextResponse {
    var body: [String: Any] = [isMatch ? "matchId" : "dateId": dateId, "reason": reason]
    let trimmed = note.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty { body["note"] = trimmed }
    return try await send(request("/api/me/report", method: "POST", body: body), as: TextResponse.self)
  }

  func block(_ dateId: String) async throws -> TextResponse {
    try await send(request("/api/me/block", method: "POST", body: ["dateId": dateId]), as: TextResponse.self)
  }

  /// Photos are private: the backend serves them only with the viewer's token.
  func image(_ url: URL) async -> UIImage? {
    var r = URLRequest(url: url)
    r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    r.setValue("imessage/\(KismetConfig.version)", forHTTPHeaderField: "X-Kismet-Client")
    guard let (data, response) = try? await Self.session.data(for: r),
          (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
    return UIImage(data: data)
  }
}

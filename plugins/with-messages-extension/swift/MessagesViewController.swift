import Messages
import SwiftUI
import UIKit

/// The Kismet iMessage app: SwiftUI hosted in the Messages extension's view controller.
final class MessagesViewController: MSMessagesAppViewController {
  private let store = KismetStore()

  override func viewDidLoad() {
    super.viewDidLoad()
    store.host = HostActions(
      expand: { [weak self] in self?.requestPresentationStyle(.expanded) },
      compact: { [weak self] in self?.requestPresentationStyle(.compact) },
      open: { [weak self] url in self?.extensionContext?.open(url, completionHandler: nil) },
      invite: { [weak self] in self?.insertInvite() }
    )
    let host = UIHostingController(rootView: RootView(store: store))
    host.view.backgroundColor = .clear
    host.view.translatesAutoresizingMaskIntoConstraints = false
    addChild(host)
    view.addSubview(host.view)
    NSLayoutConstraint.activate([
      host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      host.view.topAnchor.constraint(equalTo: view.topAnchor),
      host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    host.didMove(toParent: self)
  }

  override func willBecomeActive(with conversation: MSConversation) {
    super.willBecomeActive(with: conversation)
    store.style = presentationStyle
    store.refresh()
  }

  override func willTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
    super.willTransition(to: presentationStyle)
    store.style = presentationStyle
  }

  override func didTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
    super.didTransition(to: presentationStyle)
    store.style = presentationStyle
  }

  /// "Invite a friend": a Kismet card with a link to the website's join page, put in the message field.
  private func insertInvite() {
    guard let conversation = activeConversation else { return }
    let layout = MSMessageTemplateLayout()
    layout.image = UIImage(named: "InviteCard")
    layout.caption = "Let our agents meet first"
    layout.subcaption = "Kismet · private AI intros"
    let message = MSMessage(session: MSSession())
    message.layout = layout
    message.url = KismetConfig.joinURL
    message.summaryText = "Join me on Kismet: \(KismetConfig.joinURL.absoluteString)"
    message.accessibilityLabel = "Kismet invite. Let our agents meet first."
    conversation.insert(message) { [weak self] error in
      DispatchQueue.main.async {
        if let error {
          self?.store.show("Couldn't add the invite: \(error.localizedDescription)")
        } else {
          UIImpactFeedbackGenerator(style: .light).impactOccurred()
          self?.requestPresentationStyle(.compact)
        }
      }
    }
  }
}

import CoreText
import SwiftUI

/// Fraunces, the app's serif (bundled in the extension by the config plugin), registered once at launch.
enum KismetFonts {
  static let registered: Bool = {
    for name in ["Fraunces_400Regular", "Fraunces_600SemiBold"] {
      if let url = Bundle.main.url(forResource: name, withExtension: "ttf") {
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
      }
    }
    return true
  }()
}

extension Font {
  /// Names and titles: Fraunces SemiBold, scaled with Dynamic Type.
  static func serifTitle(_ size: CGFloat, relativeTo style: Font.TextStyle = .title) -> Font {
    _ = KismetFonts.registered
    return .custom("Fraunces-SemiBold", size: size, relativeTo: style)
  }

  /// Prompt answers: Fraunces Regular.
  static func serifText(_ size: CGFloat, relativeTo style: Font.TextStyle = .title3) -> Font {
    _ = KismetFonts.registered
    return .custom("Fraunces-Regular", size: size, relativeTo: style)
  }
}

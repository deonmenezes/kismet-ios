#!/bin/bash
# Archive + export the App Store IPA on the Mac (run from the repo root after `npm ci`).
# Needs: the distribution identity p12 in ~/.appstoreconnect/signing/<CERT>.p12 (+ .p12.password) and the
# "Kismet App Store" / "Kismet Messages App Store" profiles installed in
# ~/Library/Developer/Xcode/UserData/Provisioning Profiles (Xcode 26 matches them by Name).
# SSH sessions can't unlock the login keychain, so this signs from a throwaway keychain.
set -euo pipefail
CERT=${CERT:-833H38VW73}
TEAM=Q4MU4GRWRD
ROOT=$(pwd)
OUT=${OUT:-$ROOT/build-ios}
KC=$HOME/Library/Keychains/kismet-build.keychain-db
KCPW=${KCPW:-$(openssl rand -hex 16)}  # throwaway keychain, deleted on exit

# EXPORT_ONLY=1 re-exports an existing $OUT/Kismet.xcarchive.
if [ -z "${EXPORT_ONLY:-}" ]; then
  npx expo prebuild -p ios --clean --no-install
  (cd ios && pod install)
fi

security delete-keychain "$KC" 2>/dev/null || true
security create-keychain -p "$KCPW" "$KC"
security set-keychain-settings -lut 7200 "$KC"
security unlock-keychain -p "$KCPW" "$KC"
security import "$HOME/.appstoreconnect/signing/$CERT.p12" -k "$KC" -P "$(cat "$HOME/.appstoreconnect/signing/$CERT.p12.password")" -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KCPW" "$KC" >/dev/null
security list-keychains -d user -s "$KC" $(security list-keychains -d user | tr -d '"')
trap 'security list-keychains -d user -s $(security list-keychains -d user | tr -d "\"" | grep -v kismet-build); security delete-keychain "$KC"' EXIT

if [ -z "${EXPORT_ONLY:-}" ]; then
rm -rf "$OUT" && mkdir -p "$OUT"
xcodebuild -workspace ios/Kismet.xcworkspace -scheme Kismet -configuration Release -destination generic/platform=iOS \
  -archivePath "$OUT/Kismet.xcarchive" OTHER_CODE_SIGN_FLAGS="--keychain $KC" archive | tee "$OUT/archive.log" | grep -E "error:|\*\* ARCHIVE" || true
fi
test -d "$OUT/Kismet.xcarchive" || { echo "archive failed, see $OUT/archive.log"; exit 1; }

cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>$TEAM</string>
  <key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>iPhone Distribution</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>com.deonmenezes.agentdates</key><string>Kismet App Store</string>
    <key>com.deonmenezes.agentdates.messages</key><string>Kismet Messages App Store</string>
  </dict>
  <key>uploadSymbols</key><true/>
  <key>destination</key><string>export</string>
</dict>
</plist>
PLIST
# Xcode's IPA step runs /usr/bin/rsync, which starts the first `rsync` on PATH as its server; Homebrew's rsync 3.x
# rejects the flags ("Copy failed"), so export with the system PATH only.
PATH=/usr/bin:/bin:/usr/sbin:/sbin xcodebuild -exportArchive -archivePath "$OUT/Kismet.xcarchive" -exportPath "$OUT" -exportOptionsPlist "$OUT/ExportOptions.plist" \
  | tee "$OUT/export.log" | grep -E "error:|EXPORT" || true
ls -la "$OUT"/*.ipa

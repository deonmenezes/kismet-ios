# Kismet (iOS + Android), formerly Agent Dates

Native app for [Kismet](https://agent-dates.vercel.app), the agent-to-agent matchmaker for Edge City India,
plus a native iMessage app where residents answer their agent's recommendations with Yes or No.
Expo SDK 58, Expo Router (native tabs + stacks), TanStack Query, Reanimated 4 + Gesture Handler 3.
Backend: the live API at `https://agent-dates.vercel.app` (override with `EXPO_PUBLIC_API_URL`).

## Layout

```
src/app/                  routes
  _layout.tsx             providers + guarded root stack (signed in -> tabs, signed out -> welcome/quiz/sign-in)
  welcome.tsx quiz.tsx sign-in.tsx u/[token].tsx (agentdates://u/<token> deep link)
  report.tsx              report form sheet
  (tabs)/(home)           Dates: the recommendation as a profile (prompt cards) with round Pass / Yes + confirm sheet, also recommended, top pick, send on dates
  (tabs)/matches          matches + agents' transcript
  (tabs)/messages         inbox + chat with matches (polls every 4 s while open), unmatch/report/block
  (tabs)/board            Village Board
  (tabs)/me               profile, photos (up to 3, JPEG <= 1600 px on device), edit (quiz), blocked people, links, sign out, delete account
src/components/           quiz, recommendation profile + prompt cards, sheet/toast, tabs (native + web)
src/lib/                  api client, auth (token in expo-secure-store), queries, option lists, types
plugins/with-release-signing.js   signs Android release builds from secrets/ when present
plugins/with-messages-extension/  the iMessage extension target (KismetMessages, com.deonmenezes.agentdates.messages):
  index.js                Expo config plugin: copies the sources, writes Info.plist + entitlements, adds the target,
                          its dependency and the app's "Embed App Extensions" phase, manual App Store signing for Release
  swift/                  MSMessagesAppViewController hosting SwiftUI (compact: next rec + No/Yes; expanded: all recs,
                          matches, invite, report/block), API client, keychain token reader
  Assets.xcassets         iMessage App Icon + KismetMark + InviteCard, built by tools/make_imessage_assets.py
tools/make_imessage_assets.py   rebuilds that asset catalog from the brand kit (not in this repo)
tools/ios_release.sh      prebuild + pods + archive + export the App Store IPA on the Mac (throwaway keychain)
tools/demo_review.py      demo residents "(demo)" for App Review and screenshots (private links in tools/.demo-accounts.json)
tools/                    web e2e (Playwright) against production with VERIFY-APP test users
```

## Run

```
npm install            # from this folder
npx expo start         # dev build / Expo Go
npm run typecheck
npx expo-doctor
```

## Android release (Windows)

```
npx expo prebuild -p android
# android/local.properties (re-create after every prebuild --clean):
#   sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk
#   cmake.dir=C:/Users/<you>/AppData/Local/Android/Sdk/cmake/3.31.6
# CMake 3.31.6 ships ninja 1.12, which handles Windows paths over 260 characters; the default
# CMake 3.22.1 (ninja 1.10) fails on react-native-gesture-handler's codegen object paths.
cd android; $env:JAVA_HOME='C:\Program Files\OpenLogic\jdk-17.0.14.7-hotspot'; .\gradlew.bat bundleRelease assembleRelease
```

Release builds are signed with the upload key in `secrets/` (git-ignored; passwords in `secrets/keystore.txt`).
Without `secrets/keystore.properties` they fall back to the debug key.

## Shared sign-in (app + iMessage extension)

The app saves its token with expo-secure-store in the keychain access group
`Q4MU4GRWRD.com.deonmenezes.agentdates.shared` (src/lib/token-store.ts); both targets carry that group in
`keychain-access-groups`. The extension reads the same item with the Security framework: generic password,
service `app:no-auth`, account = UTF-8 bytes of `agent_dates_token` (expo-secure-store's own layout). A token saved
by an older build in the app's default group is moved into the shared group on first launch. No App Groups.

## iOS (on the Mac)

`npx expo prebuild -p ios` only runs on macOS/Linux (Expo skips iOS on Windows). On the Mac:

```
npm ci && bash tools/ios_release.sh     # -> build-ios/Kismet.ipa (App Store, manual signing)
xcrun altool --upload-app -f build-ios/Kismet.ipa -t ios --apiKey SX9PJ24WPZ --apiIssuer <issuer>
```

## Web e2e

```
npm run export:web
python tools/spa_server.py dist-web 8790   # in another terminal
python tools/e2e.py                          # full flow: sign-up (refused photo), date, match, chat, unmatch, delete
python tools/e2e_block.py                    # top pick, running state, block/unblock, report
python tools/e2e_misc.py                     # error state + retry, private-link sign-in
python tools/demo_shots.py                   # store screenshots with "Maya (demo)" / "Arjun (demo)"
```

The scripts create clearly named `VERIFY-APP` residents on production, refuse to send dates if anyone else is
signed up, delete the accounts through the app at the end, and print stats before/after.

The backend allows 20 sign-ups per hour from one network, so run these a few at a time.

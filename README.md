# Kismet for iOS (and iMessage)

**Your agent dates. You just say yes.**

This is the native app for [Kismet](https://kismet-village.vercel.app), the agent-to-agent matchmaker for the
residents of Edge City India (Mandrem, Goa, 11 Oct to 1 Nov 2026). Each resident gets a private AI agent. The
server sends it on short dates with other residents' agents, and the human only answers Yes or No to their own
agent's recommendations. A match needs both agents to recommend it and both people to say yes (secret double
opt-in).

The repository has two parts:

- **The app** (Expo SDK 58, Expo Router, TanStack Query, Reanimated): a short sign-up quiz, the Dates tab
  (each recommendation as a profile with Pass / Yes), Matches with the agents' date transcript, Messages, the
  Village Board, and Me (profile, photos, blocked people, delete account). Report, block and unmatch are on every
  card and chat.
- **An iMessage app** (SwiftUI, `plugins/with-messages-extension/`): answer your agent's next recommendation from
  inside Messages, see your matches, and send a friend an invite bubble. It shares the sign-in with the app through
  the keychain.

The backend, website, WhatsApp channel and the **Agent Village** integration (Kismet is a mini-app in Edge City's
Agent Village; village agents reach it through a partner API and an MCP server) are in the companion web
repository. The app talks to the live API at `https://agent-dates.vercel.app` (override with `EXPO_PUBLIC_API_URL`).

Kismet is an independent app made for Edge City residents. It is not an official Edge City product.

## Run it

```bash
npm install
npx expo start        # dev build or Expo Go; press i for the iOS simulator, w for web
npm run typecheck
npm test              # node:test unit tests in tests/
```

The iMessage extension only builds in a native iOS build (`npx expo prebuild -p ios`, then Xcode or
`tools/ios_release.sh` on a Mac). Signing material (certificates, `.p8` keys, provisioning profiles, keystores) is
never in the repository. `.gitignore` excludes it.

## Documentation

- [`docs/ENGINEERING.md`](docs/ENGINEERING.md): layout, Android and iOS release steps, shared sign-in, web e2e.
- [`STORE.md`](STORE.md): store listing, privacy labels and App Review notes. The demo account's private link is
  given to App Review in App Store Connect and is not published here.
- [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md): every commit from the private development history (18 to 29 Oct 2026).
  This repository starts with a fresh history.
- `screens/`: simulator screenshots, captured on demo and test accounts.

## Licence

MIT, see [LICENSE](LICENSE).

# Mobile App Quality

For iOS, Android, Expo, React Native, and hybrid (Capacitor-style) apps headed toward real
users or store submission. Mobile is not small-screen web: judge it against platform
conventions, device constraints, and real failure modes, not layout alone.

## Safe areas and layout
- Respect safe area insets (notches, Dynamic Island, status/nav bars, home indicator);
  never hardcode top/bottom padding.
- Handle keyboard overlap, orientation change, and foldable/split-screen resizing without
  clipping or hiding controls.
- Check touch targets (~44x44pt iOS / 48x48dp Android), gesture conflicts (edge-swipe vs.
  back), and tap latency.

## Permissions
- Request only what a feature needs, at the point of use, with a rationale shown before
  the OS prompt.
- Handle denied, "ask every time," and revoked-after-grant states — the app must degrade,
  not crash or dead-end.
- Match the permission to its declared purpose (iOS `Info.plist` usage strings, Android
  manifest + runtime request); an unused or mismatched permission is a store-rejection risk.

## Offline and network states
- Design loading, empty, error, retry, timeout, stale-data, and conflict as distinct UI
  states, not one spinner that never resolves.
- Cancel in-flight requests on navigation away; never let a stale response overwrite newer
  state.
- Block or queue actions that need connectivity; never silently drop a user's write.

## Deep links
- Validate scheme, host, and path before acting; treat every deep-link parameter as
  untrusted input (tokens, IDs, redirect targets).
- Prefer HTTPS-verified universal/app links over bare custom schemes for anything
  security-sensitive — a custom scheme can be claimed by another app.
- Confirm destructive or state-changing actions a link triggers before executing them.

## Release-build honesty
- A change verified only in Expo Go, a debug build, or the simulator is not verified for
  release: these skip native modules, code signing, ProGuard/R8 shrinking, and
  production JS/Hermes behavior.
- State plainly which build was used — simulator, physical device, Expo Go, debug,
  internal/preview build, release build, TestFlight/Play track — never imply release
  readiness from a lesser one.
- Re-check permission prompts, deep links, and push notifications on a release-like build;
  debug builds often bypass these paths.

## Store review readiness
- Privacy: declared data collection matches actual behavior (App Store privacy labels,
  Play Data safety section, Apple privacy manifest for third-party SDKs).
- Policy: no placeholder/demo content, no dead links, no crash on first launch, an account
  deletion path if accounts exist.
- Metadata: version/build number bumped, screenshots match current UI, age rating matches
  actual content.

## What to report
- The build type and device/simulator the check actually ran on.
- Permissions requested, why, and what happens when denied.
- Offline/error states covered vs. skipped.
- What was not verified — never claim release or store readiness without a release-like
  build check.

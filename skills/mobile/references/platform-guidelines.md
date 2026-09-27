# Platform Guidelines

Links only — read the page directly when a check depends on current platform policy.
This file is a pointer, not a summary; it is not kept current with the linked pages.

- Apple Human Interface Guidelines — https://developer.apple.com/design/human-interface-guidelines/
  — use for iOS/iPadOS/visionOS layout, navigation, and interaction conventions (safe
  areas, gestures, controls).
- Android Core App Quality — https://developer.android.com/develop/adaptive-apps/quality-guidelines/core-app-quality
  — use for Google's baseline Android release checklist (stability, UI, permissions,
  performance).
- Expo Documentation — https://docs.expo.dev/
  — use for current Expo SDK APIs, config plugins, and EAS build/submit behavior; check
  the SDK version the project targets, not `latest`.
- OWASP MASVS — https://mas.owasp.org/MASVS/
  — use for mobile app security requirements (storage, crypto, auth, network, resilience)
  when a check needs depth beyond this route; hand off to the `secure` route for a full
  audit.
- Apple Privacy Manifests — https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
  — use when checking third-party SDK privacy manifests and required-reason API
  declarations for App Store submission.
- Android Accessibility — https://developer.android.com/guide/topics/ui/accessibility/testing
  — use for TalkBack, content descriptions, and Android accessibility testing.
- Apple Accessibility — https://developer.apple.com/design/human-interface-guidelines/accessibility
  — use for VoiceOver, Dynamic Type, and iOS accessibility design requirements.

## Precedence
These platform guidelines, and a project's existing navigation/state libraries, win over
this route's own defaults when they conflict. Security depth beyond a quick WebView or
permissions check belongs to the `secure` route; visual design and design-system work
belongs to the `uiux` route.

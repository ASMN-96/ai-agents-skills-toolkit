---
name: mobile
description: Build or review React Native/Expo apps, WebViews, and native iOS/Android quality — safe areas, permissions, deep links, offline states, secure storage, release builds, store review readiness. Use for mobile app work.
license: MIT
---

# Mobile route

Review or build React Native, Expo, and native iOS/Android apps — including WebViews, JS
bridges, and Capacitor-style hybrid shells — for platform quality and store readiness.

Paths below are relative to this skill's folder (in Claude Code: `${CLAUDE_SKILL_DIR}`).

## 1. Scope the task
- Building a screen or feature: do the work, then check it against
  `references/mobile-app-quality.md`.
- Reviewing a diff or PR: use the `review` route for the general pass; apply this route's
  checklists to the mobile-specific surfaces in it.
- A WebView, JS bridge, or hybrid (Capacitor-style) surface is involved: always read
  `references/webview-boundary.md`, regardless of task type.
- A deep security audit (auth, secrets, dependencies, threat model) is needed beyond a
  WebView boundary check: hand off to the `secure` route.
- Only visual design, design-system, or accessibility polish is in question, with no
  platform-quality angle: hand off to the `uiux` route.

## 2. Read the checklists that apply
1. `references/mobile-app-quality.md` — safe areas, permissions, offline/network states,
   deep links, release-build honesty, store review readiness. Read for any mobile screen,
   feature, or release check.
2. `references/webview-boundary.md` — origin allowlists, bridge message validation,
   token/storage boundary, file/device access, navigation interception. Read whenever a
   WebView, JS bridge, or embedded web surface exists.
3. `references/platform-guidelines.md` — links to Apple HIG, Android Core App Quality,
   Expo docs, OWASP MASVS, Apple Privacy Manifests, and platform accessibility guides.
   Follow a link when a check needs current platform policy this route does not restate.

## 3. Check the build type before judging readiness
- Ask, or read from context, what was actually run: simulator, physical device, Expo Go,
  debug build, internal/preview build, or release build.
- Expo Go and debug builds skip native modules, code signing, ProGuard/R8 shrinking, and
  production JS/Hermes behavior — never call a change "ready" from these alone.
- Permission prompts, deep links, and push notifications behave differently on
  release-like builds; re-check them there before claiming readiness.

## 4. Review the surfaces present
- Safe areas, touch targets, keyboard overlap, orientation/foldable resizing.
- Permission requests: minimal scope, rationale before the OS prompt, denied/revoked
  handling.
- Offline and network states: loading, empty, error, retry, timeout, stale-data,
  conflict — each a distinct UI.
- Deep links: scheme/host/path validation, untrusted parameters, universal/app links over
  bare custom schemes for anything sensitive.
- WebViews and bridges: origin allowlist, message validation, token/storage boundary (see
  `references/webview-boundary.md`).
- Store readiness: privacy declarations match behavior, no placeholder content, account
  deletion path if accounts exist, version/build bumped.

## Precedence (overrides upstream text)
- No upstream skill is vendored into this route: an Expo-official and a Callstack
  React Native skill source were both evaluated and rejected (hooks, MCP, or off-scope);
  the files under `references/` are toolkit-authored and are the only checklists.
- Platform guidelines (`references/platform-guidelines.md`) and a project's existing
  navigation/state libraries win over this route's defaults when they conflict.
- Security depth beyond the WebView boundary check (auth, secrets, dependency/supply-chain,
  threat modeling) belongs to the `secure` route, not this one.
- Visual design, design tokens, and accessibility polish with no platform-quality angle
  belong to the `uiux` route.
- Never claim a test, build, simulator run, device check, or store-review outcome passed
  unless its output is in this session.

## Output
- State the build type the check used (or that none was run) before any readiness claim.
- Findings grouped by surface (layout/safe-area, permissions, offline/network, deep
  links, WebView/bridge, store readiness), each with a concrete fix.
- What was not checked, plainly — no fake validation.

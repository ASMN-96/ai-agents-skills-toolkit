---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
status: approved
---

# Native Mobile App Quality

## Purpose

Review native mobile and mobile-web app quality without treating mobile as just small web. Mobile validation must account for platform conventions, device constraints, release-like builds, permissions, and real user failure modes.

## When To Use

Use for iOS, Android, Expo, React Native, Capacitor, WebView-heavy, mobile-web, or app-store-bound experiences.

## When Not To Use

Do not use for backend-only, desktop-only, or docs-only work unless mobile consumers are affected.

## Required Review Areas

- iOS and Android platform expectations, navigation conventions, permission UX, gestures, status surfaces, and store-critical behavior.
- Safe areas, notches, Dynamic Island, status bars, Android navigation bars, keyboard overlap, and orientation changes.
- Touch targets, gesture conflicts, scroll behavior, tap latency, haptics expectations, and accidental destructive actions.
- Accessibility labels, roles, focus order, screen-reader behavior, dynamic type, contrast, reduced motion, and keyboard/external input where relevant.
- Offline, poor network, captive portal, retry, timeout, stale data, and request cancellation states.
- Loading, empty, error, retry, disabled, success, sync, conflict, and partial-completion states.
- Permission minimization: request only needed permissions, explain user value, and handle denied/revoked permissions.
- App identifiers, signing, entitlements, bundle IDs, package names, provisioning, store listing, deep-link, push, and app-store-critical config caution.
- App Store and Play Store readiness risks: policy-sensitive claims, privacy labels, data collection, age rating, payment rules, and review-only behavior.
- Release-like build validation rather than assuming Expo Go, debug, hot reload, simulator-only, or development behavior is enough.
- Performance risks: startup, memory, battery, bridge overhead, image/video cost, expensive re-renders, network waterfall, and slow devices.
- Localization, RTL, mixed-language text, truncation, long names, currency/date/number formats, and text fitting.

## Evidence Requirements

Report which validation mode was used:

- simulator;
- physical device;
- Expo Go;
- dev build;
- preview/internal build;
- release-like build;
- app-store/test-flight/play-track review evidence;
- not performed.

If mobile validation was not performed, state that honestly and do not claim mobile readiness. Screenshots, logs, accessibility inspection, performance output, and build identifiers count only when actually collected.

## Stop Conditions

- Mobile release readiness is requested but only desktop/browser evidence exists.
- Permission, signing, entitlement, store, auth, payment, or production configuration risk appears.
- Device-specific layout breaks cannot be checked.
- Accessibility or critical offline/error states are unreviewed for a user-facing mobile flow.

## Agent Routing

UIUX owns mobile acceptance criteria. Frontend-agent implements scoped UI changes. QA-test-agent verifies device/build evidence. Security-review handles auth, permission, token, WebView, and privacy risk. PR-release-gate blocks release claims without evidence.

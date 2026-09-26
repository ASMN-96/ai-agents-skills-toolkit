# WebView Boundary Review

Treat every WebView — a native app embedding web content, or a Capacitor-style hybrid
app — as a trust boundary between untrusted web content and privileged native capability.

## Origin control
- Restrict navigation to an explicit domain allowlist. `originWhitelist={['*']}` (React
  Native WebView) or an unrestricted `shouldOverrideUrlLoading` / `WKNavigationDelegate`
  accepts any page, including one reached via redirect from an allowed page.
- Validate scheme, host, and path on every navigation and redirect, not just the initial
  load; block `file://`, `javascript:`, and unrecognized custom schemes.
- Send external links, OAuth, and payment flows to the system browser or an ephemeral auth
  session (`ASWebAuthenticationSession`, Custom Tabs) — not the app's general-purpose
  WebView.

## Bridge messages
- Never trust `onMessage` / `postMessage` payloads: validate the sender origin, the
  message shape, and an allowlist of message types before acting on any of them.
- Give the bridge the smallest surface possible — no generic "eval this" or "call this
  native method by name" handler.
- Treat every bridge-triggered action (navigation, storage write, permission request,
  payment) as attacker-controlled input whenever the page can be anything other than your
  own first-party origin.

## Tokens and storage
- Never inject an auth token, session cookie, or API key into a page whose origin you do
  not fully control — a compromised or malicious page in the WebView can read it.
- Keep secure storage (Keychain, EncryptedSharedPreferences, SecureStore) native-side; the
  bridge mediates specific actions, it does not hand raw credentials to JS.
- Clear WebView cookies and local storage on logout; a shared WebView process can leak
  session data across accounts.

## File and device access
- Disable local file access (`allowFileAccess`, `allowUniversalAccessFromFileURLs`) unless
  the page genuinely needs it — it lets a loaded page read app-private files.
- Gate camera, microphone, location, and downloads behind the same permission rules as
  native code; a WebView requesting them must not bypass user consent.
- Limit upload/download file types and size; treat a downloaded file as untrusted before
  opening it natively.

## Navigation and transport
- Intercept navigation to catch redirects off the allowlist, blocked schemes, and mixed
  content (HTTP inside an HTTPS page).
- Never disable certificate validation or allow insecure transport, even for a "trusted"
  internal domain.
- Provide a real error/retry state for failed loads; a blank WebView with no feedback
  hides both bugs and blocked navigation.

## What to report
- The allowlist (or its absence) and how it is enforced.
- Which bridge messages exist, what each triggers, and whether the sender is validated.
- Whether tokens or credentials ever cross into the WebView.
- What was not checked — never claim a WebView boundary is safe without reading the
  actual origin and bridge-handling code.

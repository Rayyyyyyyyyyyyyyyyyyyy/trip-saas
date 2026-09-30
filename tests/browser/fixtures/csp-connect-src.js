const violations = [];
document.addEventListener("securitypolicyviolation", (event) => {
  violations.push({
    blockedURI: event.blockedURI,
    effectiveDirective: event.effectiveDirective,
  });
});

window.cspProbe = { violations };
document.body.dataset.status = "started";

try {
  void fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/csp-probe:generateContent",
  ).catch(() => undefined);
} catch {}

try {
  void fetch("https://example.com/credential-probe").catch(() => undefined);
} catch {}

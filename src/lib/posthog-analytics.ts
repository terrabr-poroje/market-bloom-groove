// Lightweight PostHog bootstrap without adding a runtime dependency.
// The project key is a public client-side ingestion key, not an admin/API secret.
type PostHogClient = {
  init: (token: string, options: Record<string, unknown>) => void;
  _i?: unknown[][];
  __SV?: number;
  [key: string]: unknown;
} & unknown[];

declare global {
  interface Window {
    posthog?: PostHogClient;
  }
}

const POSTHOG_PROJECT_KEY = "phc_wcud9SVrUD9aH7iENeAEbuJ95qYFXciXArnoCYLgDryn";
const POSTHOG_API_HOST = "https://us.i.posthog.com";
const POSTHOG_SCRIPT_HOST = "https://us-assets.i.posthog.com";

let initialized = false;

export function initializePostHog(): void {
  if (typeof window === "undefined" || initialized || window.posthog?.__SV) return;
  // Do not send analytics from local/test environments or preview hosts.
  if (!["terrabar.ir", "www.terrabar.ir"].includes(window.location.hostname)) return;

  const posthog = (window.posthog = window.posthog || ([] as unknown as PostHogClient));
  posthog._i = posthog._i || [];

  posthog.init = (token, options) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `${POSTHOG_SCRIPT_HOST}/static/array.js`;
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);

    posthog._i?.push([token, options]);
    posthog.__SV = 1;
  };

  const methods = [
    "capture", "captureException", "captureSession", "identify", "alias",
    "people.set", "people.set_once", "people.unset", "people.increment",
    "people.append", "people.remove", "people.clear_charges", "people.track_charge",
    "people.setPersonProperties", "people.setPersonPropertiesForFlags",
    "group", "reset", "register", "register_once", "unregister", "get_distinct_id",
    "getGroups", "setPersonProperties", "setPersonPropertiesForFlags",
    "resetGroups", "set_group_properties", "startSessionRecording",
    "stopSessionRecording", "sessionRecordingStarted", "capturePerformance",
    "on", "off", "getFeatureFlag", "getFeatureFlagPayload", "isFeatureEnabled",
    "reloadFeatureFlags", "getSurveys", "getActiveMatchingSurveys",
  ];
  for (const method of methods) {
    const parts = method.split(".");
    let target: Record<string, unknown> = posthog as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) {
      const existing = target[part];
      if (!existing || typeof existing !== "object") target[part] = [];
      target = target[part] as Record<string, unknown>;
    }
    const name = parts[parts.length - 1];
    target[name] = (...args: unknown[]) => {
      const queue = target as unknown as { push: (value: unknown[]) => void };
      queue.push([name, ...args]);
    };
  }

  posthog.init(POSTHOG_PROJECT_KEY, {
    api_host: POSTHOG_API_HOST,
    defaults: "2025-05-24",
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_performance: true,
    capture_exceptions: true,
    autocapture: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
  });
  initialized = true;
}

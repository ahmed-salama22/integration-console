import type { Environment } from "./types";

export interface EnvConfig {
  x: {
    bearerToken: string;
    appMap: Record<string, string>;
  };
  netfeedr: {
    channelsApiKey: string;
    searchApiKey: string;
    updaterApiKey: string;
  };
  emedia: {
    apiUrl: string;
    username: string;
    password: string;
  };
}

export function getEnvConfig(env: Environment): EnvConfig {
  const prefix = env === "cxm" ? "CXM" : "SITE";

  let appMap: Record<string, string> = {};
  try {
    const raw = process.env[`${prefix}_X_APP_MAP`];
    if (raw) appMap = JSON.parse(raw);
  } catch {
    // ignore parse errors
  }

  return {
    x: {
      bearerToken: process.env[`${prefix}_X_BEARER_TOKEN`] || "",
      appMap,
    },
    netfeedr: {
      channelsApiKey: process.env[`${prefix}_NETFEEDR_CHANNELS_API_KEY`] || "",
      searchApiKey: process.env[`${prefix}_NETFEEDR_SEARCH_API_KEY`] || "",
      updaterApiKey: process.env[`${prefix}_NETFEEDR_UPDATER_API_KEY`] || "",
    },
    emedia: {
      apiUrl:
        process.env[`${prefix}_EMEDIA_API_URL`] ||
        "https://dart.emediamonitor.net/api/channels",
      username: process.env[`${prefix}_EMEDIA_USERNAME`] || "",
      password: process.env[`${prefix}_EMEDIA_PASSWORD`] || "",
    },
  };
}

/** Check which env vars are configured (non-empty) */
export function getConfigStatus(env: Environment) {
  const prefix = env === "cxm" ? "CXM" : "SITE";
  return {
    x: !!process.env[`${prefix}_X_BEARER_TOKEN`],
    netfeedrChannels: !!process.env[`${prefix}_NETFEEDR_CHANNELS_API_KEY`],
    netfeedrSearch: !!process.env[`${prefix}_NETFEEDR_SEARCH_API_KEY`],
    netfeedrUpdater: !!process.env[`${prefix}_NETFEEDR_UPDATER_API_KEY`],
    emedia:
      !!process.env[`${prefix}_EMEDIA_USERNAME`] &&
      !!process.env[`${prefix}_EMEDIA_PASSWORD`],
  };
}

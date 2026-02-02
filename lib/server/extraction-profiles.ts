import type { ExtractionProfileConfig } from "@/lib/server/article-extractor";
import profilesData from "@/config/extraction-profiles.json";

type MatchType = "host" | "domain" | "regex" | "feedId";

interface MatchRule {
  type: MatchType;
  value: string;
}

interface ProfileEntry {
  id: string;
  name?: string;
  match: MatchRule;
  priority?: number;
  preferJsonLd?: boolean;
  selectors?: ExtractionProfileConfig["selectors"];
  removals?: ExtractionProfileConfig["removals"];
  postprocess?: ExtractionProfileConfig["postprocess"];
}

interface OverrideEntry {
  id: string;
  name?: string;
  match: MatchRule;
  priority?: number;
  profileId?: string;
  preferJsonLd?: boolean;
  selectors?: ExtractionProfileConfig["selectors"];
  removals?: ExtractionProfileConfig["removals"];
  postprocess?: ExtractionProfileConfig["postprocess"];
}

interface ExtractionProfilesConfig {
  profiles: ProfileEntry[];
  overrides: OverrideEntry[];
}

const config = profilesData as ExtractionProfilesConfig;

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

function matchRule(url: URL, feedId: string | undefined, rule: MatchRule): boolean {
  const value = rule.value.toLowerCase();
  switch (rule.type) {
    case "feedId":
      return !!feedId && feedId.toLowerCase() === value;
    case "host": {
      return url.hostname.toLowerCase() === value;
    }
    case "domain": {
      const host = url.hostname.toLowerCase();
      return host === value || host.endsWith(`.${value}`);
    }
    case "regex": {
      try {
        return new RegExp(rule.value, "i").test(url.toString());
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function selectBestMatch<T extends { match: MatchRule; priority?: number }>(
  list: T[],
  url: URL,
  feedId?: string
): T | undefined {
  return list
    .filter((entry) => matchRule(url, feedId, entry.match))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
}

function mergeProfile(
  base?: ProfileEntry,
  override?: OverrideEntry
): ExtractionProfileConfig | undefined {
  if (!base && !override) return undefined;

  const baseSelectors = base?.selectors ?? undefined;
  const overrideSelectors = override?.selectors ?? undefined;

  const baseRemovals = normalizeStringArray(base?.removals ?? undefined);
  const overrideRemovals = normalizeStringArray(override?.removals ?? undefined);

  const basePost = base?.postprocess ?? undefined;
  const overridePost = override?.postprocess ?? undefined;

  return {
    preferJsonLd: override?.preferJsonLd ?? base?.preferJsonLd,
    selectors: {
      content: overrideSelectors?.content ?? baseSelectors?.content,
      title: overrideSelectors?.title ?? baseSelectors?.title,
    },
    removals: [...baseRemovals, ...overrideRemovals],
    postprocess: {
      stripSelectors:
        overridePost?.stripSelectors ?? basePost?.stripSelectors,
    },
  };
}

export function getExtractionProfileConfig(
  url: URL,
  feedId?: string
): ExtractionProfileConfig | undefined {
  const overrides = config?.overrides ?? [];
  const profiles = config?.profiles ?? [];

  const override = selectBestMatch(overrides, url, feedId);
  const baseProfile =
    (override?.profileId && profiles.find((profile) => profile.id === override.profileId))
    || selectBestMatch(profiles, url, feedId);

  return mergeProfile(baseProfile, override);
}

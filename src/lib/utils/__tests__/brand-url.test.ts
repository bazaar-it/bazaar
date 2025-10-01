import { hashNormalizedUrl, isLikelyAssetUrl, normalizeBrandUrl } from "../brand-url";

describe("normalizeBrandUrl", () => {
  it("normalizes protocol, casing, and trailing slashes", () => {
    expect(normalizeBrandUrl("https://www.GitHub.com/")).toBe("https://github.com");
    expect(normalizeBrandUrl("http://linear.app")).toBe("https://linear.app");
    expect(normalizeBrandUrl("linear.app")).toBe("https://linear.app");
  });

  it("removes hashes and query params by default", () => {
    expect(normalizeBrandUrl("https://example.com/path/?utm_source=test#section"))
      .toBe("https://example.com/path");
  });

  it("preserves query parameters when keepQuery = true", () => {
    expect(
      normalizeBrandUrl("https://example.com/path?a=1&b=2", { keepQuery: true })
    ).toBe("https://example.com/path?a=1&b=2");
  });

  it("rejects asset URLs", () => {
    expect(normalizeBrandUrl("https://example.r2.dev/projects/id/images/logo.png")).toBeNull();
    expect(normalizeBrandUrl("https://cdn.example.com/assets/logo.svg")).toBeNull();
  });

  it("rejects unsupported protocols and invalid URLs", () => {
    expect(normalizeBrandUrl("javascript:alert('boom')")).toBeNull();
    expect(normalizeBrandUrl("not-a-url")).toBeNull();
  });
});

describe("isLikelyAssetUrl", () => {
  it("detects image extensions and known asset paths", () => {
    expect(isLikelyAssetUrl("https://domain.com/images/logo.png")).toBe(true);
    expect(isLikelyAssetUrl("https://domain.com/path/file.svg")).toBe(true);
    expect(isLikelyAssetUrl("https://assets.domain.com/hero.jpg")).toBe(true);
  });

  it("treats normal marketing URLs as non-assets", () => {
    expect(isLikelyAssetUrl("https://domain.com"))
      .toBe(false);
    expect(isLikelyAssetUrl("https://domain.com/pricing"))
      .toBe(false);
  });
});

describe("hashNormalizedUrl", () => {
  it("produces deterministic hashes", () => {
    const normalized = normalizeBrandUrl("https://www.github.com");
    expect(normalized).toBe("https://github.com");
    const hash = hashNormalizedUrl(normalized!);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashNormalizedUrl(normalized!)).toBe(hash);
  });
});

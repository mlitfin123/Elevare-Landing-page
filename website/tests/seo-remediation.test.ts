import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { MARKETPLACE_FILTER_QUERY_KEYS, RETIRED_WORKOUT_REDIRECTS } from "../lib/legacy-routes.ts";
import { getCalculatorPath, getLegacyToolPath, tools } from "../lib/tools.ts";

const projectRoot = process.cwd();

function readVercelConfig() {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8")) as {
    bulkRedirectsPath?: string;
    outputDirectory?: string;
    trailingSlash: boolean;
    redirects: Array<{
      source: string;
      destination: string;
      permanent?: boolean;
      has?: Array<{ type: string; key?: string; value?: string }>;
    }>;
    headers: Array<{ source: string; has?: Array<{ type: string; key: string }> }>;
  };
}

function readRedirectArtifact() {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, "config", "redirects.json"), "utf8")) as Array<{
    source: string;
    destination: string;
    permanent: boolean;
  }>;
}

function walkFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

test("all Prep Files rely on ArticleLayout for their single H1", () => {
  const prepFiles = walkFiles(path.join(projectRoot, "content", "blog"))
    .filter((filePath) => /mens-physique-classic-physique-prep-\d+-weeks-out\.mdx$/.test(filePath));

  assert.ok(prepFiles.length > 0);

  for (const filePath of prepFiles) {
    const source = fs.readFileSync(filePath, "utf8");
    assert.equal(/^#\s+/m.test(source), false, path.basename(filePath));
  }
});

test("all canonical calculator routes have permanent legacy redirects", () => {
  const redirects = readRedirectArtifact();

  for (const tool of tools) {
    for (const suffix of ["", "/"]) {
      const redirect = redirects.find((entry) => entry.source === `${getLegacyToolPath(tool.slug)}${suffix}`);
      assert.ok(redirect, `Missing legacy redirect for ${tool.slug}${suffix}`);
      assert.equal(redirect.destination, `${getCalculatorPath(tool.slug)}/`);
      assert.equal(redirect.permanent, true);
    }
  }

  assert.equal(
    redirects.some((entry) => entry.source.replace(/\/$/, "") === "/tools/workout-generator"),
    false,
  );
});

test("all 30 retired hash-suffixed workout routes redirect permanently", () => {
  const redirects = readRedirectArtifact();
  const workoutRedirects = redirects.filter((entry) =>
    /^\/workouts\/.+-[a-f0-9]{8}\/?$/.test(entry.source),
  );

  assert.equal(RETIRED_WORKOUT_REDIRECTS.length, 30);
  assert.equal(workoutRedirects.length, 60);

  for (const redirect of workoutRedirects) {
    assert.equal(redirect.permanent, true);
    assert.equal(
      redirect.destination,
      `${redirect.source.replace(/\/$/, "").replace(/-[a-f0-9]{8}$/, "")}/`,
    );
  }
});

test("filtered marketplace URLs receive an immediate noindex response header", () => {
  const config = readVercelConfig();
  const protectedQueries = new Set(
    config.headers.flatMap((entry) => entry.has?.filter((condition) => condition.type === "query").map((condition) => condition.key) ?? []),
  );

  assert.deepEqual(
    [...protectedQueries].sort(),
    [...MARKETPLACE_FILTER_QUERY_KEYS].sort(),
  );

  assert.equal(
    config.headers.some((entry) => entry.source.startsWith("/professionals") && !entry.has?.length),
    false,
  );
});

test("Vercel deploys the Next.js application with one authoritative routing config", () => {
  const config = readVercelConfig();
  const nextConfig = fs.readFileSync(path.join(projectRoot, "next.config.ts"), "utf8");
  const embeddedLegacyRedirects = config.redirects.filter((redirect) => !redirect.has?.length);

  assert.equal(config.bulkRedirectsPath, undefined);
  assert.deepEqual(embeddedLegacyRedirects, readRedirectArtifact());
  assert.ok(config.redirects.length + config.headers.length < 2048);
  assert.equal(config.trailingSlash, true);
  assert.equal(config.outputDirectory, undefined);
  assert.doesNotMatch(nextConfig, /output:\s*["']export["']/);
  assert.equal(fs.existsSync(path.join(projectRoot, "app", "tools", "page.tsx")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, "app", "tools", "[slug]", "page.tsx")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, "app", "tools", "workout-generator", "page.tsx")), true);
});

test("active application source does not link to legacy html legal URLs", () => {
  const activeDirectories = ["app", "components", path.join("content", "blog"), "lib"];
  const occurrences: string[] = [];

  for (const directory of activeDirectories) {
    for (const filePath of walkFiles(path.join(projectRoot, directory))) {
      if (!/\.(?:ts|tsx|md|mdx|html)$/.test(filePath)) continue;
      const source = fs.readFileSync(filePath, "utf8");
      if (/\/(?:privacy-policy|terms-of-service)\.html\b/.test(source)) {
        occurrences.push(path.relative(projectRoot, filePath));
      }
    }
  }

  assert.deepEqual(occurrences, []);
});

test("optimized production images exist and originals remain archived", () => {
  const productionAssets = [
    "stagelab-logo.webp",
    "blog-posts/how-many-calories-should-i-eat-to-lose-weight/featured.webp",
    "blog-posts/mens-physique-classic-physique-prep-17-weeks-out/back.webp",
    "blog-posts/mens-physique-classic-physique-prep-7-weeks-out/front.webp",
    "blog-posts/mens-physique-classic-physique-prep-7-weeks-out/side.webp",
    "blog-posts/mens-physique-classic-physique-prep-7-weeks-out/back.webp",
  ];

  for (const relativePath of productionAssets) {
    assert.equal(fs.existsSync(path.join(projectRoot, "public", relativePath)), true, relativePath);
  }

  assert.equal(
    fs.existsSync(path.join(projectRoot, "source-assets", "seo-originals", "stagelab-logo-transparent.png")),
    true,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        projectRoot,
        "source-assets",
        "seo-originals",
        "blog-posts",
        "mens-physique-classic-physique-prep-7-weeks-out",
        "front.png",
      ),
    ),
    true,
  );
});

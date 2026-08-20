import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const publicDirectory = path.join(projectRoot, "public");
const sourceArchiveDirectory = path.join(projectRoot, "source-assets", "seo-originals");

const assets = [
  { source: "stagelab-logo-transparent.png", destination: "stagelab-logo.webp", width: 720, quality: 88 },
  { source: "blog-posts/how-much-protein-do-i-need/featured.png", destination: "blog-posts/how-much-protein-do-i-need/featured.webp", width: 1200, quality: 82 },
  { source: "blog-posts/500-calorie-mistake-weight-loss/featured.png", destination: "blog-posts/500-calorie-mistake-weight-loss/featured.webp", width: 1200, quality: 82 },
  { source: "blog-posts/how-many-calories-should-i-eat-to-lose-weight/featured.png", destination: "blog-posts/how-many-calories-should-i-eat-to-lose-weight/featured.webp", width: 1200, quality: 82 },
  { source: "blog-posts/healthy-eating-doesnt-always-mean-weight-loss/featured.png", destination: "blog-posts/healthy-eating-doesnt-always-mean-weight-loss/featured.webp", width: 1200, quality: 82 },
  { source: "blog-posts/stop-changing-your-workout-every-week/featured.png", destination: "blog-posts/stop-changing-your-workout-every-week/featured.webp", width: 1200, quality: 82 },
  { source: "blog-posts/why-your-weight-changes-overnight/featured.png", destination: "blog-posts/why-your-weight-changes-overnight/featured.webp", width: 1200, quality: 82 },
  { source: "blog-posts/alcohol-fat-loss-muscle-growth/featured.png", destination: "blog-posts/alcohol-fat-loss-muscle-growth/featured.webp", width: 1200, quality: 82 },
  { source: "blog-posts/mens-physique-classic-physique-prep-17-weeks-out/front.png", destination: "blog-posts/mens-physique-classic-physique-prep-17-weeks-out/front.webp", width: 520, quality: 82 },
  { source: "blog-posts/mens-physique-classic-physique-prep-17-weeks-out/side.png", destination: "blog-posts/mens-physique-classic-physique-prep-17-weeks-out/side.webp", width: 520, quality: 82 },
  { source: "blog-posts/mens-physique-classic-physique-prep-17-weeks-out/back.png", destination: "blog-posts/mens-physique-classic-physique-prep-17-weeks-out/back.webp", width: 520, quality: 82 },
  { source: "blog-posts/mens-physique-classic-physique-prep-15-weeks-out/front.png", destination: "blog-posts/mens-physique-classic-physique-prep-15-weeks-out/front.webp", width: 520, quality: 82 },
  { source: "blog-posts/mens-physique-classic-physique-prep-15-weeks-out/side.png", destination: "blog-posts/mens-physique-classic-physique-prep-15-weeks-out/side.webp", width: 520, quality: 82 },
  { source: "blog-posts/mens-physique-classic-physique-prep-15-weeks-out/back.png", destination: "blog-posts/mens-physique-classic-physique-prep-15-weeks-out/back.webp", width: 520, quality: 82 },
  { source: "blog-posts/mens-physique-classic-physique-prep-14-weeks-out/back.png", destination: "blog-posts/mens-physique-classic-physique-prep-14-weeks-out/back.webp", width: 520, quality: 82 },
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

for (const asset of assets) {
  const publicSource = path.join(publicDirectory, asset.source);
  const archivedSource = path.join(sourceArchiveDirectory, asset.source);
  const input = await exists(publicSource) ? publicSource : archivedSource;
  const output = path.join(publicDirectory, asset.destination);

  if (!(await exists(input))) {
    throw new Error(`Missing image source: ${asset.source}`);
  }

  await fs.mkdir(path.dirname(output), { recursive: true });
  await sharp(input)
    .rotate()
    .resize({ width: asset.width, withoutEnlargement: true })
    .webp({ quality: asset.quality, smartSubsample: true })
    .toFile(output);

  if (await exists(publicSource)) {
    await fs.mkdir(path.dirname(archivedSource), { recursive: true });
    await fs.rename(publicSource, archivedSource);
  }

  const before = (await fs.stat(archivedSource)).size;
  const after = (await fs.stat(output)).size;
  console.log(`${asset.source}: ${before} -> ${after} bytes`);
}

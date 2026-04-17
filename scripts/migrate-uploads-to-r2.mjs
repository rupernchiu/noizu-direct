/**
 * migrate-uploads-to-r2.mjs
 * Uploads all files from public/uploads/ to Cloudflare R2, then updates DB records
 * that reference /uploads/ paths to use the R2 public URL.
 *
 * Run: node scripts/migrate-uploads-to-r2.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const dotenv = require("dotenv");
dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config({ path: path.join(rootDir, ".env.local"), override: false });

const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require(path.join(rootDir, "src", "generated", "prisma", "client.ts"));

// ── R2 client ────────────────────────────────────────────────────────────────

const r2 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

// ── Prisma client ─────────────────────────────────────────────────────────────

const pgUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString: pgUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMimeType(ext) {
  const map = {
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

function scanDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(fullPath));
    } else if (entry.isFile() && entry.name !== ".gitkeep") {
      results.push(fullPath);
    }
  }
  return results;
}

async function verifyR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const uploadsDir = path.join(rootDir, "public", "uploads");
  const files = scanDir(uploadsDir);

  if (files.length === 0) {
    console.log("No files found in public/uploads/ (excluding .gitkeep). Nothing to do.");
    await prisma.$disconnect();
    pool.end();
    return;
  }

  console.log(`=== Uploading ${files.length} file(s) to R2 ===\n`);

  const errors = [];
  let uploaded = 0;

  for (const filePath of files) {
    const relPath = path.relative(path.join(rootDir, "public"), filePath).replace(/\\/g, "/");
    // relPath = "uploads/library/filename.webp"
    const ext = path.extname(filePath);
    const contentType = getMimeType(ext);

    try {
      const body = fs.readFileSync(filePath);
      await r2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: relPath,
        Body: body,
        ContentType: contentType,
      }));

      const ok = await verifyR2(relPath);
      uploaded++;
      const publicUrl = `${PUBLIC_URL}/${relPath}`;
      console.log(`Uploaded ${uploaded}/${files.length}: ${relPath} ${ok ? "✓" : "⚠ verify failed"}`);
      if (!ok) errors.push({ file: relPath, error: "HeadObject verify failed" });
    } catch (e) {
      errors.push({ file: relPath, error: e.message });
      console.error(`  [error] ${relPath}: ${e.message}`);
    }
  }

  // ── Update DB records ──────────────────────────────────────────────────────

  console.log("\n=== Updating database records ===\n");

  const OLD_PREFIX = "/uploads/";
  const NEW_PREFIX = `${PUBLIC_URL}/uploads/`;

  function rewriteUrl(val) {
    if (!val) return val;
    if (val.startsWith(OLD_PREFIX)) return NEW_PREFIX + val.slice(OLD_PREFIX.length);
    return val;
  }

  function rewriteJsonArray(json) {
    if (!json) return json;
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return json;
      const updated = arr.map((item) => {
        if (typeof item === "string") return rewriteUrl(item) ?? item;
        if (item && typeof item === "object") {
          const out = { ...item };
          for (const k of ["url", "src", "image", "thumbnail"]) {
            if (out[k]) out[k] = rewriteUrl(out[k]) ?? out[k];
          }
          return out;
        }
        return item;
      });
      return JSON.stringify(updated);
    } catch {
      return json;
    }
  }

  let dbUpdates = 0;

  // User.avatar
  const users = await prisma.user.findMany({ where: { avatar: { startsWith: OLD_PREFIX } } });
  for (const u of users) {
    await prisma.user.update({ where: { id: u.id }, data: { avatar: rewriteUrl(u.avatar) } });
    dbUpdates++;
    console.log(`  User(${u.id}).avatar → ${rewriteUrl(u.avatar)}`);
  }

  // CreatorProfile.avatar / bannerImage / logoImage
  const creators = await prisma.creatorProfile.findMany({
    where: {
      OR: [
        { avatar: { startsWith: OLD_PREFIX } },
        { bannerImage: { startsWith: OLD_PREFIX } },
        { logoImage: { startsWith: OLD_PREFIX } },
      ],
    },
  });
  for (const c of creators) {
    const data = {};
    if (c.avatar?.startsWith(OLD_PREFIX)) data.avatar = rewriteUrl(c.avatar);
    if (c.bannerImage?.startsWith(OLD_PREFIX)) data.bannerImage = rewriteUrl(c.bannerImage);
    if (c.logoImage?.startsWith(OLD_PREFIX)) data.logoImage = rewriteUrl(c.logoImage);
    if (Object.keys(data).length) {
      await prisma.creatorProfile.update({ where: { id: c.id }, data });
      dbUpdates++;
      console.log(`  CreatorProfile(${c.id}) → ${JSON.stringify(data)}`);
    }
  }

  // Product.images (JSON array)
  const products = await prisma.product.findMany({ where: { images: { contains: OLD_PREFIX } } });
  for (const p of products) {
    const updated = rewriteJsonArray(p.images);
    if (updated !== p.images) {
      await prisma.product.update({ where: { id: p.id }, data: { images: updated } });
      dbUpdates++;
      console.log(`  Product(${p.id}).images updated`);
    }
  }

  // Media.url
  const medias = await prisma.media.findMany({ where: { url: { startsWith: OLD_PREFIX } } });
  for (const m of medias) {
    await prisma.media.update({ where: { id: m.id }, data: { url: rewriteUrl(m.url) } });
    dbUpdates++;
    console.log(`  Media(${m.id}).url → ${rewriteUrl(m.url)}`);
  }

  // Post.coverImage
  const posts = await prisma.post.findMany({ where: { coverImage: { startsWith: OLD_PREFIX } } });
  for (const p of posts) {
    await prisma.post.update({ where: { id: p.id }, data: { coverImage: rewriteUrl(p.coverImage) } });
    dbUpdates++;
    console.log(`  Post(${p.id}).coverImage → ${rewriteUrl(p.coverImage)}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("\n=== Summary ===");
  console.log(`Files uploaded:   ${uploaded} / ${files.length}`);
  console.log(`Upload errors:    ${errors.length}`);
  console.log(`DB records updated: ${dbUpdates}`);
  if (errors.length) {
    console.log("\nErrors:");
    for (const e of errors) console.log(`  ${e.file}: ${e.error}`);
  }

  await prisma.$disconnect();
  pool.end();
  console.log("\nDone. Local files preserved as backup.");
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

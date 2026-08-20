// Lives outside /api on purpose: Vercel turns every .js file under /api into a
// serverless function, and the Hobby plan caps a deployment at 12.
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// cid comes from the URL — the regex blocks ":" so a forged cid can't escape
// its key namespace. uid always comes from the session, never the request.
const CID_RE = /^[a-z0-9-]{1,40}$/;

export function charKey(uid, cid, part) {
  if (!CID_RE.test(cid ?? "")) return null;
  return `char:${uid}:${cid}:${part}`;
}

export async function readData(key) {
  try {
    const data = await redis.get(key);
    return data ?? {};
  } catch {
    return {};
  }
}

export async function writeData(key, data) {
  await redis.set(key, data);
}

export async function deleteData(...keys) {
  await redis.del(...keys);
}

export async function readAvatar(key) {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    const { b64, mimeType } = data;
    return {
      buffer: Buffer.from(b64, "base64"),
      contentType: mimeType ?? "image/png",
    };
  } catch {
    return null;
  }
}

export async function writeAvatar(key, mimeType, imageBuffer) {
  await redis.set(key, { mimeType, b64: imageBuffer.toString("base64") });
}

export { redis };

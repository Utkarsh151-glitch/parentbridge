import mongoose from "mongoose";

/**
 * One cached Mongoose connection per server instance.
 * Vercel reuses warm function instances, so caching on globalThis keeps us far
 * below the Atlas M0 500-connection cap (each instance holds a small pool).
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __pbMongoose?: Cache };
const cache: Cache = g.__pbMongoose ?? (g.__pbMongoose = { conn: null, promise: null });

export class DbNotConfiguredError extends Error {
  constructor() {
    super("MONGODB_URI is not set. Add it to .env.local (see .env.example).");
    this.name = "DbNotConfiguredError";
  }
}

/**
 * Atlas passwords often contain characters like "@" or ":" that must be
 * percent-encoded in a connection string. Encode the credentials safely
 * (the host is whatever follows the *last* "@").
 */
export function normaliseMongoUri(uri: string): string {
  const m = /^(mongodb(?:\+srv)?:\/\/)(.*)$/.exec(uri.trim());
  if (!m) return uri.trim();
  const [, scheme, rest] = m;
  const at = rest.lastIndexOf("@");
  if (at === -1) return uri.trim();
  const userinfo = rest.slice(0, at);
  const hostPart = rest.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const enc = (s: string) => {
    let decoded = s;
    try {
      decoded = decodeURIComponent(s);
    } catch {
      /* not encoded */
    }
    return encodeURIComponent(decoded);
  };
  const creds = colon === -1 ? enc(userinfo) : `${enc(userinfo.slice(0, colon))}:${enc(userinfo.slice(colon + 1))}`;
  return `${scheme}${creds}@${hostPart}`;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  const raw = process.env.MONGODB_URI;
  if (!raw) throw new DbNotConfiguredError();
  const uri = normaliseMongoUri(raw);
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        dbName: process.env.MONGODB_DB || "parentbridge",
        maxPoolSize: 5,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        bufferCommands: false,
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  if (cache.conn) await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}

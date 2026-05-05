import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { DEFAULT_FRIENDS } from "@/lib/friends";
import type { Friend, PasswordCredential, PublicStoreData, StoreData } from "@/types/review";

type TokenPayload =
  | {
      role: "admin";
    }
  | {
      role: "friend";
      friendId: string;
    };

const STORE_PATH = path.join(process.cwd(), "data", "rate507.json");
const SESSION_SECRET = process.env.RATE507_SESSION_SECRET ?? "rate507-local-secret";

let writeQueue = Promise.resolve();

function initialStore(): StoreData {
  return {
    friends: DEFAULT_FRIENDS,
    reviews: [],
    passwordCredentials: {},
  };
}

function normalizeStore(data: Partial<StoreData>): StoreData {
  const friends = Array.isArray(data.friends) && data.friends.length === 5 ? data.friends : DEFAULT_FRIENDS;

  return {
    friends,
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    passwordCredentials: data.passwordCredentials ?? {},
  };
}

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(initialStore(), null, 2), "utf8");
  }
}

export async function readStore() {
  await ensureStoreFile();

  try {
    const rawData = await fs.readFile(STORE_PATH, "utf8");
    return normalizeStore(JSON.parse(rawData) as Partial<StoreData>);
  } catch {
    const store = initialStore();
    await writeStore(store);
    return store;
  }
}

async function writeStore(store: StoreData) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function updateStore<T>(mutator: (store: StoreData) => T | Promise<T>) {
  const task = writeQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });

  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}

export function toPublicStore(store: StoreData): PublicStoreData {
  return {
    friends: store.friends,
    reviews: store.reviews,
    passwordStatus: Object.fromEntries(
      store.friends.map((friend) => [friend.id, Boolean(store.passwordCredentials[friend.id])]),
    ),
  };
}

export function sanitizeFriends(friends: Friend[], currentFriends: Friend[]) {
  return currentFriends.map((currentFriend, index) => ({
    id: currentFriend.id,
    name: friends[index]?.name?.trim().slice(0, 28) || currentFriend.name,
  }));
}

export function createPasswordCredential(password: string): PasswordCredential {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");

  return { salt, hash };
}

export function verifyPassword(password: string, credential?: PasswordCredential) {
  if (!credential) {
    return false;
  }

  const hash = crypto.createHash("sha256").update(`${credential.salt}:${password}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(credential.hash));
}

export function createToken(payload: TokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");

  return `${body}.${signature}`;
}

export function verifyToken(token: string | undefined) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [body, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  } catch {
    return null;
  }
}

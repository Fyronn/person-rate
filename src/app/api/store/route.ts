import { NextResponse } from "next/server";
import { DEFAULT_FRIENDS } from "@/lib/friends";
import {
  createPasswordCredential,
  createToken,
  readStore,
  sanitizeFriends,
  toPublicStore,
  updateStore,
  verifyPassword,
  verifyToken,
} from "@/lib/serverStore";
import type { Friend, Review } from "@/types/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.RATE507_ADMIN_PASSWORD ?? "admin123";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function createId() {
  return crypto.randomUUID();
}

function getValidatedScore(score: unknown) {
  const value = Number(score);
  return Number.isInteger(value) && value >= 1 && value <= 10 ? value : null;
}

function isDateValue(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isAdminToken(token: unknown) {
  const payload = verifyToken(typeof token === "string" ? token : undefined);
  return payload?.role === "admin";
}

function getFriendPayload(token: unknown) {
  const payload = verifyToken(typeof token === "string" ? token : undefined);
  return payload?.role === "friend" ? payload : null;
}

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ data: toPublicStore(store) });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Geçersiz JSON isteği.");
  }

  if (body.action === "login") {
    const password = typeof body.password === "string" ? body.password : "";

    if (body.mode === "admin") {
      if (password !== ADMIN_PASSWORD) {
        return jsonError("Admin şifresi hatalı.", 401);
      }

      return NextResponse.json({
        session: { role: "admin", token: createToken({ role: "admin" }) },
        data: toPublicStore(await readStore()),
      });
    }

    const friendId = typeof body.friendId === "string" ? body.friendId : "";
    const store = await readStore();
    const friendExists = store.friends.some((friend) => friend.id === friendId);

    if (!friendExists) {
      return jsonError("Kullanıcı bulunamadı.", 404);
    }

    if (!verifyPassword(password, store.passwordCredentials[friendId])) {
      return jsonError("Şifre hatalı.", 401);
    }

    return NextResponse.json({
      session: { role: "friend", friendId, token: createToken({ role: "friend", friendId }) },
      data: toPublicStore(store),
    });
  }

  if (body.action === "saveFriends") {
    if (!isAdminToken(body.token)) {
      return jsonError("Admin yetkisi gerekli.", 403);
    }

    const friends = Array.isArray(body.friends) ? (body.friends as Friend[]) : [];
    const data = await updateStore((store) => {
      store.friends = sanitizeFriends(friends, store.friends);
      return toPublicStore(store);
    });

    return NextResponse.json({ data });
  }

  if (body.action === "saveAdminSettings") {
    if (!isAdminToken(body.token)) {
      return jsonError("Admin yetkisi gerekli.", 403);
    }

    const friends = Array.isArray(body.friends) ? (body.friends as Friend[]) : [];
    const passwordDrafts =
      body.passwordDrafts && typeof body.passwordDrafts === "object"
        ? (body.passwordDrafts as Record<string, unknown>)
        : {};

    const data = await updateStore((store) => {
      store.friends = sanitizeFriends(friends, store.friends);

      for (const friend of store.friends) {
        const password = passwordDrafts[friend.id];
        if (typeof password === "string" && password.trim()) {
          store.passwordCredentials[friend.id] = createPasswordCredential(password.trim());
        }
      }

      return toPublicStore(store);
    });

    return NextResponse.json({ data });
  }

  if (body.action === "setPassword") {
    if (!isAdminToken(body.token)) {
      return jsonError("Admin yetkisi gerekli.", 403);
    }

    const friendId = typeof body.friendId === "string" ? body.friendId : "";
    const password = typeof body.password === "string" ? body.password.trim() : "";

    const data = await updateStore((store) => {
      if (!store.friends.some((friend) => friend.id === friendId)) {
        throw new Error("Kullanıcı bulunamadı.");
      }

      if (password) {
        store.passwordCredentials[friendId] = createPasswordCredential(password);
      } else {
        delete store.passwordCredentials[friendId];
      }

      return toPublicStore(store);
    });

    return NextResponse.json({ data });
  }

  if (body.action === "submitReview") {
    const payload = getFriendPayload(body.token);
    if (!payload) {
      return jsonError("Kullanıcı girişi gerekli.", 403);
    }

    const targetId = typeof body.targetId === "string" ? body.targetId : "";
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 360) : "";
    const score = getValidatedScore(body.score);
    const date = typeof body.date === "string" ? body.date : "";

    if (!isDateValue(date) || score === null || !comment) {
      return jsonError("Yorum bilgileri eksik.");
    }

    if (payload.friendId === targetId) {
      return jsonError("Kendine yorum yazamazsın.");
    }

    const data = await updateStore((store) => {
      if (!store.friends.some((friend) => friend.id === targetId)) {
        throw new Error("Hedef kullanıcı bulunamadı.");
      }

      const existingReview = store.reviews.find(
        (review) =>
          review.authorId === payload.friendId && review.targetId === targetId && review.date === date,
      );

      if (existingReview) {
        existingReview.score = score;
        existingReview.comment = comment;
        existingReview.createdAt = new Date().toISOString();
      } else {
        const review: Review = {
          id: createId(),
          authorId: payload.friendId,
          targetId,
          date,
          score,
          comment,
          createdAt: new Date().toISOString(),
        };

        store.reviews.unshift(review);
      }

      return toPublicStore(store);
    });

    return NextResponse.json({ data });
  }

  if (body.action === "deleteReview") {
    if (!isAdminToken(body.token)) {
      return jsonError("Admin yetkisi gerekli.", 403);
    }

    const reviewId = typeof body.reviewId === "string" ? body.reviewId : "";
    const data = await updateStore((store) => {
      store.reviews = store.reviews.filter((review) => review.id !== reviewId);
      return toPublicStore(store);
    });

    return NextResponse.json({ data });
  }

  if (body.action === "reset") {
    if (!isAdminToken(body.token)) {
      return jsonError("Admin yetkisi gerekli.", 403);
    }

    const data = await updateStore((store) => {
      store.friends = DEFAULT_FRIENDS;
      store.reviews = [];
      store.passwordCredentials = {};
      return toPublicStore(store);
    });

    return NextResponse.json({ data });
  }

  return jsonError("Bilinmeyen işlem.");
}

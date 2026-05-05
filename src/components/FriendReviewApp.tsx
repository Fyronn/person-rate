"use client";

import {
  CalendarDays,
  Eye,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  RotateCcw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Star,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_FRIENDS, getFriendName } from "@/lib/friends";
import {
  clearSession,
  loadActiveUser,
  loadFriends,
  loadPasswords,
  loadReviews,
  loadSession,
  resetLocalData,
  saveActiveUser,
  saveFriends,
  savePasswords,
  saveReviews,
  saveSession,
} from "@/lib/storage";
import type { AppView, Friend, FriendPasswords, Review, Session } from "@/types/review";

const ADMIN_PASSWORD = "admin123";
const SCORE_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

function getTodayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function averageScore(reviews: Review[]) {
  if (reviews.length === 0) {
    return "0.0";
  }

  const total = reviews.reduce((sum, review) => sum + review.score, 0);
  return (total / reviews.length).toFixed(1);
}

function isValidFriendSession(session: Session | null, friends: Friend[]) {
  return session?.role === "friend" && friends.some((friend) => friend.id === session.friendId);
}

export function FriendReviewApp() {
  const [isReady, setIsReady] = useState(false);
  const [friends, setFriends] = useState<Friend[]>(DEFAULT_FRIENDS);
  const [passwords, setPasswords] = useState<FriendPasswords>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loginMode, setLoginMode] = useState<"friend" | "admin">("friend");
  const [loginFriendId, setLoginFriendId] = useState(DEFAULT_FRIENDS[0].id);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState("");
  const [targetId, setTargetId] = useState(DEFAULT_FRIENDS[1].id);
  const [reviewDate, setReviewDate] = useState(getTodayInputValue);
  const [feedDate, setFeedDate] = useState(getTodayInputValue);
  const [score, setScore] = useState(8);
  const [comment, setComment] = useState("");
  const [view, setView] = useState<AppView>("daily");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const storedFriends = loadFriends();
    const storedSession = loadSession();
    const storedActiveUser = loadActiveUser();
    const firstFriendId = storedFriends[0].id;
    const defaultFriendId = storedFriends.some((friend) => friend.id === storedActiveUser)
      ? storedActiveUser
      : firstFriendId;

    setFriends(storedFriends);
    setPasswords(loadPasswords());
    setReviews(loadReviews());
    setLoginFriendId(defaultFriendId);
    setSession(
      storedSession?.role === "admin" || isValidFriendSession(storedSession, storedFriends)
        ? storedSession
        : null,
    );
    setTargetId(storedFriends.find((friend) => friend.id !== defaultFriendId)?.id ?? storedFriends[1].id);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    saveFriends(friends);
  }, [friends, isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    savePasswords(passwords);
  }, [isReady, passwords]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    saveReviews(reviews);
  }, [reviews, isReady]);

  const activeUserId = session?.role === "friend" ? session.friendId : "";
  const activeUserName = activeUserId ? getFriendName(friends, activeUserId) : "Admin";
  const isAdmin = session?.role === "admin";
  const hasUnsetPasswords = friends.some((friend) => !passwords[friend.id]?.trim());

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    saveActiveUser(activeUserId);

    if (targetId === activeUserId) {
      setTargetId(friends.find((friend) => friend.id !== activeUserId)?.id ?? "");
    }
  }, [activeUserId, friends, targetId]);

  useEffect(() => {
    if (isAdmin && view === "mine") {
      setView("settings");
    }
  }, [isAdmin, view]);

  const todaysReviews = useMemo(
    () => reviews.filter((review) => review.date === feedDate),
    [feedDate, reviews],
  );

  const myReviews = useMemo(
    () => reviews.filter((review) => review.targetId === activeUserId),
    [activeUserId, reviews],
  );

  const existingReview = useMemo(
    () =>
      reviews.find(
        (review) =>
          review.authorId === activeUserId &&
          review.targetId === targetId &&
          review.date === reviewDate,
      ),
    [activeUserId, reviewDate, reviews, targetId],
  );

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanPassword = loginPassword.trim();

    if (loginMode === "admin") {
      if (cleanPassword !== ADMIN_PASSWORD) {
        setLoginStatus("Admin şifresi hatalı.");
        return;
      }

      const adminSession: Session = { role: "admin" };
      saveSession(adminSession);
      setSession(adminSession);
      setView("settings");
      setLoginPassword("");
      setLoginStatus("");
      return;
    }

    const savedPassword = passwords[loginFriendId]?.trim();
    if (!savedPassword) {
      setLoginStatus("Bu kullanıcı için admin henüz şifre belirlememiş.");
      return;
    }

    if (cleanPassword !== savedPassword) {
      setLoginStatus("Şifre hatalı.");
      return;
    }

    const friendSession: Session = { role: "friend", friendId: loginFriendId };
    saveSession(friendSession);
    saveActiveUser(loginFriendId);
    setSession(friendSession);
    setTargetId(friends.find((friend) => friend.id !== loginFriendId)?.id ?? "");
    setLoginPassword("");
    setLoginStatus("");
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setLoginPassword("");
    setStatus("");
    setView("daily");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeUserId) {
      setStatus("Yorum yazmak için kullanıcı girişi gerekli.");
      return;
    }

    const cleanComment = comment.trim();
    if (!cleanComment) {
      setStatus("Yorum boş olamaz.");
      return;
    }

    if (activeUserId === targetId) {
      setStatus("Kendine yorum yazamazsın.");
      return;
    }

    if (existingReview) {
      setReviews((currentReviews) =>
        currentReviews.map((review) =>
          review.id === existingReview.id
            ? { ...review, score, comment: cleanComment, createdAt: new Date().toISOString() }
            : review,
        ),
      );
      setStatus("Günün yorumu güncellendi.");
    } else {
      setReviews((currentReviews) => [
        {
          id: createId(),
          authorId: activeUserId,
          targetId,
          date: reviewDate,
          score,
          comment: cleanComment,
          createdAt: new Date().toISOString(),
        },
        ...currentReviews,
      ]);
      setStatus("Anonim yorum kaydedildi.");
    }

    setComment("");
    setFeedDate(reviewDate);
    setView("daily");
  }

  function updateFriendName(friendId: string, name: string) {
    setFriends((currentFriends) =>
      currentFriends.map((friend) =>
        friend.id === friendId ? { ...friend, name: name.slice(0, 28) } : friend,
      ),
    );
  }

  function updatePassword(friendId: string, password: string) {
    setPasswords((currentPasswords) => ({
      ...currentPasswords,
      [friendId]: password.slice(0, 32),
    }));
  }

  function deleteReview(reviewId: string) {
    if (!isAdmin) {
      return;
    }

    setReviews((currentReviews) => currentReviews.filter((review) => review.id !== reviewId));
    setStatus("Yorum silindi.");
  }

  function resetApp() {
    resetLocalData();
    setFriends(DEFAULT_FRIENDS);
    setPasswords({});
    setReviews([]);
    setSession(null);
    setLoginFriendId(DEFAULT_FRIENDS[0].id);
    setTargetId(DEFAULT_FRIENDS[1].id);
    setStatus("Yerel kayıtlar sıfırlandı.");
  }

  if (!isReady) {
    return <main className="app-shell loading-screen">Yükleniyor...</main>;
  }

  if (!session) {
    return (
      <main className="app-shell login-shell">
        <section className="login-card" aria-label="Giriş">
          <div className="login-brand">
            <p className="eyebrow">Rate507</p>
            <h1>Giriş yap</h1>
            <p>Yorumlar anonim kalır, kimlik sadece doğru kişinin kendi hesabıyla yazması için kullanılır.</p>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Giriş tipi">
            <button
              className={loginMode === "friend" ? "tab is-active" : "tab"}
              type="button"
              onClick={() => setLoginMode("friend")}
            >
              <UserRoundCheck aria-hidden="true" size={17} />
              <span>Kullanıcı</span>
            </button>
            <button
              className={loginMode === "admin" ? "tab is-active" : "tab"}
              type="button"
              onClick={() => setLoginMode("admin")}
            >
              <ShieldCheck aria-hidden="true" size={17} />
              <span>Admin</span>
            </button>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {loginMode === "friend" && (
              <label>
                <span>Kullanıcı</span>
                <select value={loginFriendId} onChange={(event) => setLoginFriendId(event.target.value)}>
                  {friends.map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {friend.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span>Şifre</span>
              <input
                autoComplete="current-password"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder={loginMode === "admin" ? "adminşifresi" : "Kişisel şifre"}
              />
            </label>

            <div className="form-footer">
              <p aria-live="polite">{loginStatus}</p>
              <button className="primary-button" type="submit">
                <LockKeyhole aria-hidden="true" size={18} />
                <span>Giriş</span>
              </button>
            </div>
          </form>

          {hasUnsetPasswords && (
            <p className="login-note">İlk kurulum için admin girişi yapıp herkese şifre ver.</p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="top-band">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Rate507</p>
            <h1>Arkadaş grubunun günlük anonim puan defteri</h1>
            <p className="hero-meta">
              {formatDisplayDate(feedDate)} için {todaysReviews.length} yorum
            </p>
          </div>

          <div className="identity-panel" aria-label="Oturum">
            <span>Oturum</span>
            <div className="identity-status">
              {isAdmin ? <ShieldCheck aria-hidden="true" size={18} /> : <UserRoundCheck aria-hidden="true" size={18} />}
              <strong>{activeUserName}</strong>
            </div>
            <button className="ghost-button" type="button" onClick={handleLogout}>
              <LogOut aria-hidden="true" size={17} />
              <span>Çıkış</span>
            </button>
          </div>
        </div>
      </section>

      <section className="work-band">
        <div className={isAdmin ? "container admin-grid" : "container app-grid"}>
          {!isAdmin && (
            <form className="review-form" onSubmit={handleSubmit}>
              <div className="section-title">
                <MessageSquareText aria-hidden="true" size={22} />
                <h2>Yorum yaz</h2>
              </div>

              <div className="field-grid">
                <label>
                  <span>Tarih</span>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(event) => setReviewDate(event.target.value)}
                  />
                </label>

                <label>
                  <span>Kime?</span>
                  <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                    {friends
                      .filter((friend) => friend.id !== activeUserId)
                      .map((friend) => (
                        <option key={friend.id} value={friend.id}>
                          {friend.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <fieldset className="score-picker">
                <legend>Puan</legend>
                <div className="score-options">
                  {SCORE_OPTIONS.map((value) => (
                    <button
                      className={score === value ? "score-button is-selected" : "score-button"}
                      key={value}
                      type="button"
                      onClick={() => setScore(value)}
                      aria-pressed={score === value}
                    >
                      <Star aria-hidden="true" size={16} fill={score >= value ? "currentColor" : "none"} />
                      <span>{value}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="comment-field">
                <span>Yorum</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={360}
                  rows={5}
                  placeholder="Bugün nasıl bir iz bıraktı?"
                />
              </label>

              <div className="form-footer">
                <p aria-live="polite">{status}</p>
                <button className="primary-button" type="submit">
                  {existingReview ? <Save aria-hidden="true" size={18} /> : <Send aria-hidden="true" size={18} />}
                  <span>{existingReview ? "Güncelle" : "Kaydet"}</span>
                </button>
              </div>
            </form>
          )}

          <section className="feed-panel" aria-label="Yorumlar">
            <div className="toolbar">
              <div className="tabs" role="tablist" aria-label="Görünüm">
                <button
                  className={view === "daily" ? "tab is-active" : "tab"}
                  type="button"
                  onClick={() => setView("daily")}
                >
                  <Eye aria-hidden="true" size={17} />
                  <span>Günlük</span>
                </button>
                {!isAdmin && (
                  <button
                    className={view === "mine" ? "tab is-active" : "tab"}
                    type="button"
                    onClick={() => setView("mine")}
                  >
                    <UserRoundCheck aria-hidden="true" size={17} />
                    <span>Bana gelenler</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    className={view === "settings" ? "tab is-active" : "tab"}
                    type="button"
                    onClick={() => setView("settings")}
                  >
                    <Settings2 aria-hidden="true" size={17} />
                    <span>Yönetim</span>
                  </button>
                )}
              </div>

              {view === "daily" && (
                <label className="date-filter">
                  <CalendarDays aria-hidden="true" size={17} />
                  <input
                    type="date"
                    value={feedDate}
                    onChange={(event) => setFeedDate(event.target.value)}
                  />
                </label>
              )}
            </div>

            {view === "daily" && (
              <ReviewList
                canDelete={isAdmin}
                emptyText="Bu gün için kayıt yok."
                friends={friends}
                reviews={todaysReviews}
                onDelete={deleteReview}
              />
            )}

            {view === "mine" && !isAdmin && (
              <ReviewList
                canDelete={false}
                emptyText="Henüz sana yazılmış yorum yok."
                friends={friends}
                reviews={myReviews}
                onDelete={deleteReview}
              />
            )}

            {view === "settings" && isAdmin && (
              <div className="settings-view">
                <div className="admin-copy">
                  <ShieldCheck aria-hidden="true" size={20} />
                  <div>
                    <h2>Admin paneli</h2>
                    <p>İsimleri ve kişisel giriş şifrelerini buradan belirle.</p>
                  </div>
                </div>

                <div className="friend-editor password-editor">
                  {friends.map((friend, index) => (
                    <div className="admin-row" key={friend.id}>
                      <label>
                        <span>Kişi {index + 1}</span>
                        <input
                          value={friend.name}
                          onChange={(event) => updateFriendName(friend.id, event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Şifre</span>
                        <input
                          type="text"
                          value={passwords[friend.id] ?? ""}
                          onChange={(event) => updatePassword(friend.id, event.target.value)}
                          placeholder="Şifre belirle"
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="admin-actions">
                  <p>{hasUnsetPasswords ? "Bazı kullanıcıların şifresi henüz boş." : "Tüm kullanıcıların şifresi hazır."}</p>
                  <button className="ghost-button" type="button" onClick={resetApp}>
                    <RotateCcw aria-hidden="true" size={17} />
                    <span>Sıfırla</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="stats-band">
        <div className="container stats-grid">
          {friends.map((friend) => {
            const receivedReviews = reviews.filter((review) => review.targetId === friend.id);

            return (
              <article className="stat-card" key={friend.id}>
                <span>{friend.name}</span>
                <strong>{averageScore(receivedReviews)}</strong>
                <small>{receivedReviews.length} yorum</small>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

type ReviewListProps = {
  canDelete: boolean;
  emptyText: string;
  friends: Friend[];
  reviews: Review[];
  onDelete: (reviewId: string) => void;
};

function ReviewList({ canDelete, emptyText, friends, reviews, onDelete }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div className="review-list">
      {reviews.map((review) => (
        <article className="review-card" key={review.id}>
          <div className="review-card-header">
            <div>
              <span className="review-target">{getFriendName(friends, review.targetId)}</span>
              <time>{formatDisplayDate(review.date)}</time>
            </div>
            <strong>{review.score}/10</strong>
          </div>
          <p>{review.comment}</p>
          <div className="review-card-footer">
            <span>Anonim</span>
            {canDelete && (
              <button
                aria-label="Yorumu sil"
                className="icon-button"
                type="button"
                onClick={() => onDelete(review.id)}
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

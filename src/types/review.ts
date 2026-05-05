export type Friend = {
  id: string;
  name: string;
};

export type Review = {
  id: string;
  authorId: string;
  targetId: string;
  date: string;
  score: number;
  comment: string;
  createdAt: string;
};

export type AppView = "daily" | "mine" | "settings";

export type FriendPasswords = Record<string, string>;

export type Session =
  | {
      role: "admin";
      token: string;
    }
  | {
      role: "friend";
      friendId: string;
      token: string;
    };

export type PasswordCredential = {
  salt: string;
  hash: string;
};

export type StoreData = {
  friends: Friend[];
  reviews: Review[];
  passwordCredentials: Record<string, PasswordCredential>;
};

export type PublicStoreData = {
  friends: Friend[];
  reviews: Review[];
  passwordStatus: Record<string, boolean>;
};

export type BlogStatus = "all" | "draft" | "published";

export type BlogAuthor = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
};

export type BlogCategory = {
  _id: string;
  name: string;
  description?: string;
};

export type BlogComment = {
  _id?: string;
  id?: string;
  content?: string;
  text?: string;
  body?: string;
  author?: string | BlogAuthor;
  user?: string | BlogAuthor;
  status?: string;
  createdAt?: string;
};

export type BlogRecord = {
  _id: string;
  id?: string;
  title: string;
  excerpt?: string;
  summary?: string;
  content?: string;
  category?: string | BlogCategory;
  tags?: string[] | string;
  author?: string | BlogAuthor;
  status?: string;
  published?: boolean;
  isPublished?: boolean;
  coverImage?: string;
  image?: string;
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  comments?: BlogComment[];
  commentCount?: number;
};

export type BlogPayload = {
  title: string;
  excerpt?: string;
  summary?: string;
  content: string;
  category?: string;
  tags?: string[];
  author?: string;
  status: "draft" | "published";
  coverImage?: string;
};

export type BlogCounts = {
  total?: number;
  draft?: number;
  published?: number;
};
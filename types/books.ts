export type BookRecord = {
  _id: string;
  id?: string;
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  cover?: string;
  image?: string;
  picture?: string;
  thumbnail?: string;
  category?: string;
  audience?: string;
  source?: string;
  totalChapters?: number | string;
  chapters?: number | string;
  isFetched?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BookPayload = {
  title: string;
  author: string;
  description?: string;
  category?: string;
  audience?: string;
  totalChapters?: number;
};
export type VersePayload = {
  date: string;
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
};

export type VerseRecord = VersePayload & {
  _id?: string;
  id?: string;
  origin?: "library" | "bible-api" | "fallback" | string;
  source?: string;
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type QuizQuestion = {
  _id?: string;
  id?: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  correctIndex?: number;
  level: number | string;
  difficulty: string;
  active?: boolean | string;
  isActive?: boolean | string;
  createdAt?: string;
  updatedAt?: string;
};

export type QuizQuestionPayload = {
  question: string;
  options: string[];
  correctAnswer?: string;
  correctIndex?: number;
  level: number;
  difficulty: string;
};

export type QuizMeta = {
  levels: number[];
  difficulties: string[];
};

export type QuizCounts = {
  active?: number;
  inactive?: number;
  total?: number;
};

export type DailyPoolInfo = {
  count?: number;
  total?: number;
  size?: number;
  poolSize?: number;
  questionIds?: string[];
  questions?: QuizQuestion[];
  pool?: QuizQuestion[];
  eligible?: QuizQuestion[];
  [key: string]: unknown;
};
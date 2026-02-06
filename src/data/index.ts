import historySubject from './history.json';
import ethicsSubject from './ethics.json';

// --- 型定義 ---
export interface Question {
  id: number;
  category: string;
  question: string;
  answer: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  categoryOrder: string[];
  questions: Question[];
}

// --- 教科データ ---
export const subjects: Record<string, Subject> = {
  history: historySubject as Subject,
  ethics: ethicsSubject as Subject,
};

// --- 教科ID型 ---
export type SubjectId = keyof typeof subjects;

// --- ヘルパー関数 ---
export const getSubject = (id: SubjectId): Subject => subjects[id];

export const getSubjectIds = (): SubjectId[] => Object.keys(subjects) as SubjectId[];

export const getQuestions = (subjectId: SubjectId): Question[] => subjects[subjectId].questions;

export const getCategoryOrder = (subjectId: SubjectId): string[] => subjects[subjectId].categoryOrder;

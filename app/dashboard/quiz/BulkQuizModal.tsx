"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { Button, Modal, Textarea } from "@/components/ui";
import { quizApi } from "@/lib/api/quiz";
import type { QuizQuestionPayload } from "@/types/quiz";

type Props = { open: boolean; onClose: () => void; onSaved: () => void };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRows(text: string): { questions: QuizQuestionPayload[]; errors: string[] } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { questions: [], errors: ["Enter valid JSON."] }; }
  const rows = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.questions) ? parsed.questions : null;
  if (!rows) return { questions: [], errors: ["Use a JSON array or an object with a questions array."] };

  const questions: QuizQuestionPayload[] = [];
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const label = "Question " + (index + 1);
    if (!isRecord(row)) { errors.push(label + " must be an object."); return; }
    const question = typeof row.question === "string" ? row.question.trim() : "";
    const options = Array.isArray(row.options) ? row.options.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean) : [];
    const level = Number(row.level);
    const difficulty = typeof row.difficulty === "string" ? row.difficulty.trim() : "";
    const answer = typeof row.correctAnswer === "string" ? row.correctAnswer.trim() : undefined;
    const indexAnswer = Number.isInteger(row.correctIndex) ? Number(row.correctIndex) : undefined;
    if (!question) errors.push(label + ": question text is required.");
    if (options.length < 2) errors.push(label + ": at least two options are required.");
    if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) errors.push(label + ": options must be unique.");
    if ((answer ? 1 : 0) + (indexAnswer !== undefined ? 1 : 0) !== 1) errors.push(label + ": provide exactly one correctAnswer or correctIndex.");
    if (answer && !options.includes(answer)) errors.push(label + ": correctAnswer must exactly match an option.");
    if (indexAnswer !== undefined && (indexAnswer < 0 || indexAnswer > options.length)) errors.push(label + ": correctIndex is outside the option range.");
    if (!Number.isInteger(level) || level <= 0) errors.push(label + ": level must be a positive integer.");
    if (!difficulty) errors.push(label + ": difficulty is required.");
    if (!errors.some((message) => message.startsWith(label + ":"))) questions.push({ question, options, level, difficulty, ...(answer ? { correctAnswer: answer } : { correctIndex: indexAnswer }) });
  });
  return { questions, errors };
}

export default function BulkQuizModal({ open, onClose, onSaved }: Props) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const close = () => {
    if (!pending && (!text.trim() || window.confirm("Discard this bulk question JSON?"))) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseRows(text);
    setErrors(parsed.errors);
    if (parsed.errors.length || !parsed.questions.length) {
      if (!parsed.errors.length) setErrors(["Add at least one question."]);
      return;
    }
    setPending(true);
    try {
      const result = await quizApi.createBulk(parsed.questions);
      const inserted = typeof result.metadata?.inserted === "number" ? result.metadata.inserted : parsed.questions.length;
      const skipped = typeof result.metadata?.skipped === "number" ? result.metadata.skipped : 0;
      toast.success(String(inserted) + " question" + (inserted === 1 ? "" : "s") + " inserted" + (skipped ? "; " + skipped + " skipped." : "."));
      setText("");
      onSaved();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The bulk questions could not be created.");
    } finally {
      setPending(false);
    }
  };

  return <Modal open={open} onClose={close} closeOnBackdrop={!pending} title="Bulk-create questions" description="Paste a JSON array or { questions: [...] }. Each row is validated before submission." footer={<><Button variant="secondary" onClick={close} disabled={pending}>Cancel</Button><Button type="submit" form="bulk-quiz-form" loading={pending}>Create questions</Button></>}>
    <form id="bulk-quiz-form" onSubmit={submit}>
      <Textarea aria-label="Bulk question JSON" className="min-h-80 font-mono text-xs leading-5" value={text} onChange={(event) => { setText(event.target.value); setErrors([]); }} placeholder={'[{ "question": "...", "options": ["A", "B"], "correctAnswer": "A", "level": 1, "difficulty": "easy" }]'} disabled={pending} />
      {errors.length > 0 && <div role="alert" className="mt-3 max-h-40 overflow-y-auto rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]"><ul className="list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
    </form>
  </Modal>;
}
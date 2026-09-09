"use client";

import { useState, type FormEvent } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, IconButton, Input, Modal, Select, Textarea } from "@/components/ui";
import { quizApi } from "@/lib/api/quiz";
import type { QuizMeta, QuizQuestion, QuizQuestionPayload } from "@/types/quiz";

type Props = { open: boolean; question?: QuizQuestion | null; meta: QuizMeta; onClose: () => void; onSaved: () => void };
type Option = { id: string; value: string };
type FormState = { question: string; options: Option[]; correctOptionId: string; level: string; difficulty: string };
let optionSequence = 0;
function optionId() { optionSequence += 1; return "quiz-option-" + optionSequence; }

function initial(question: QuizQuestion | null | undefined, meta: QuizMeta): FormState {
  const values = question?.options?.length ? question.options : ["", "", "", ""];
  const options = values.map((value) => ({ id: optionId(), value }));
  const answer = question?.correctAnswer ?? (question?.correctIndex !== undefined ? values[question.correctIndex] ?? (question.correctIndex > 0 ? values[question.correctIndex - 1] : undefined) : undefined);
  return {
    question: question?.question ?? "",
    options,
    correctOptionId: options.find((option) => option.value === answer)?.id ?? "",
    level: question?.level !== undefined ? String(question.level) : meta.levels[0] !== undefined ? String(meta.levels[0]) : "",
    difficulty: question?.difficulty ?? meta.difficulties[0] ?? "",
  };
}

export default function QuizQuestionModal(props: Props) {
  if (!props.open) return null;
  return <QuestionForm key={props.question?._id ?? props.question?.id ?? "new"} {...props} />;
}

function QuestionForm({ question, meta, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => initial(question, meta));
  const [errors, setErrors] = useState<{ question?: string; options?: string; answer?: string; level?: string; difficulty?: string }>({});
  const [pending, setPending] = useState(false);
  const [original] = useState(() => JSON.stringify(form));
  const dirty = JSON.stringify(form) !== original;

  const changeOption = (id: string, value: string) => {
    setForm((current) => ({ ...current, options: current.options.map((option) => option.id === id ? { ...option, value } : option) }));
    setErrors((current) => ({ ...current, options: undefined, answer: undefined }));
  };

  const removeOption = (id: string) => {
    setForm((current) => ({ ...current, options: current.options.filter((option) => option.id !== id), correctOptionId: current.correctOptionId === id ? "" : current.correctOptionId }));
  };

  const guardedClose = () => {
    if (!pending && (!dirty || window.confirm("Discard your unsaved question changes?"))) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    const nonEmpty = form.options.filter((option) => option.value.trim());
    const normalized = nonEmpty.map((option) => option.value.trim());
    const correct = nonEmpty.find((option) => option.id === form.correctOptionId);
    if (!form.question.trim()) nextErrors.question = "Question text is required.";
    if (normalized.length < 2) nextErrors.options = "Add at least two non-empty options.";
    if (new Set(normalized.map((option) => option.toLowerCase())).size !== normalized.length) nextErrors.options = "Options must be unique.";
    if (!correct) nextErrors.answer = "Select exactly one non-empty correct answer.";
    const level = Number(form.level);
    if (!Number.isInteger(level) || level <= 0) nextErrors.level = "Choose or enter a positive level.";
    if (!form.difficulty.trim()) nextErrors.difficulty = "Difficulty is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload: QuizQuestionPayload = { question: form.question.trim(), options: normalized, correctAnswer: correct?.value.trim(), level, difficulty: form.difficulty.trim() };
    setPending(true);
    try {
      const id = question?._id ?? question?.id;
      if (id) await quizApi.update(id, payload);
      else await quizApi.create(payload);
      toast.success(id ? "Question updated." : "Question created.");
      onSaved();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The question could not be saved.");
    } finally {
      setPending(false);
    }
  };

  return <Modal open onClose={guardedClose} closeOnBackdrop={!pending} title={question ? "Edit question" : "Create question"} description="The correct answer is tied to the option itself, not its position." footer={<><Button variant="secondary" onClick={guardedClose} disabled={pending}>Cancel</Button><Button type="submit" form="quiz-question-form" loading={pending}>{question ? "Save changes" : "Create question"}</Button></>}>
    <form id="quiz-question-form" onSubmit={submit} className="space-y-5">
      <Field label="Question" error={errors.question}><Textarea className="min-h-24" value={form.question} onChange={(event) => { setForm((current) => ({ ...current, question: event.target.value })); setErrors((current) => ({ ...current, question: undefined })); }} disabled={pending} /></Field>
      <fieldset><legend className="text-sm font-medium">Answer options</legend><div className="mt-2 space-y-2">{form.options.map((option, index) => <div key={option.id} className="flex items-center gap-2"><input aria-label={"Mark option " + (index + 1) + " as correct"} type="radio" name="correct-answer" checked={form.correctOptionId === option.id} onChange={() => { setForm((current) => ({ ...current, correctOptionId: option.id })); setErrors((current) => ({ ...current, answer: undefined })); }} className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-primary)]" /><Input aria-label={"Option " + (index + 1)} value={option.value} onChange={(event) => changeOption(option.id, event.target.value)} placeholder={"Option " + (index + 1)} disabled={pending} /><IconButton type="button" aria-label={"Remove option " + (index + 1)} onClick={() => removeOption(option.id)} disabled={pending || form.options.length <= 2}><HiOutlineTrash className="h-4 w-4" /></IconButton></div>)}</div>{errors.options && <p className="mt-2 text-sm text-[var(--color-danger)]">{errors.options}</p>}{errors.answer && <p className="mt-2 text-sm text-[var(--color-danger)]">{errors.answer}</p>}<Button type="button" variant="secondary" className="mt-3" onClick={() => setForm((current) => ({ ...current, options: [...current.options, { id: optionId(), value: "" }] }))} disabled={pending}><HiOutlinePlus className="h-4 w-4" />Add option</Button></fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Level" error={errors.level}>{meta.levels.length ? <Select value={form.level} onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))} disabled={pending}><option value="">Select level</option>{meta.levels.map((level) => <option key={level} value={level}>Level {level}</option>)}</Select> : <Input type="number" min="1" step="1" value={form.level} onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))} disabled={pending} />}</Field>
        <Field label="Difficulty" error={errors.difficulty}>{meta.difficulties.length ? <Select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))} disabled={pending}><option value="">Select difficulty</option>{meta.difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}</Select> : <Input value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))} disabled={pending} />}</Field>
      </div>
    </form>
  </Modal>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-sm text-[var(--color-danger)]">{error}</span>}</label>;
}
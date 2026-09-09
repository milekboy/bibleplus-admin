"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineAcademicCap, HiOutlineCalendarDays, HiOutlineEllipsisVertical, HiOutlinePlus, HiOutlineSquaresPlus, HiOutlineTrash } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, Checkbox, ConfirmModal, EmptyState, ErrorState, PageHeader, PageSection, Pagination, Select, Skeleton, StatCard, StatusPill } from "@/components/ui";
import { quizApi } from "@/lib/api/quiz";
import type { DailyPoolInfo, QuizCounts, QuizMeta, QuizQuestion } from "@/types/quiz";
import BulkQuizModal from "./BulkQuizModal";
import QuizQuestionModal from "./QuizQuestionModal";

const PAGE_SIZE = 10;
type Tab = "bank" | "daily";
type StatusFilter = "all" | "active" | "inactive";

function idOf(question: QuizQuestion) { return question._id ?? question.id ?? ""; }
function isActive(question: QuizQuestion) { return question.active !== false && question.active !== "false" && question.isActive !== false && question.isActive !== "false"; }
function answerOf(question: QuizQuestion) { return question.correctAnswer ?? (question.correctIndex !== undefined ? question.options[question.correctIndex] ?? (question.correctIndex > 0 ? question.options[question.correctIndex - 1] : undefined) : undefined) ?? "Not supplied"; }
function today() { const date = new Date(); return new Date(date.valueOf() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
function poolSize(info: DailyPoolInfo | null) {
  if (!info) return undefined;
  for (const value of [info.count, info.total, info.size, info.poolSize]) if (typeof value === "number" && Number.isFinite(value)) return value;
  for (const value of [info.questionIds, info.questions, info.pool, info.eligible]) if (Array.isArray(value)) return value.length;
}

export default function QuizPageClient() {
  const [tab, setTab] = useState<Tab>("bank");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<QuizCounts>({});
  const [meta, setMeta] = useState<QuizMeta>({ levels: [], difficulties: [] });
  const [pool, setPool] = useState<DailyPoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metaError, setMetaError] = useState("");
  const [poolError, setPoolError] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bankSelected, setBankSelected] = useState<string[]>([]);
  const [dailySelected, setDailySelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<QuizQuestion | null>(null);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuizQuestion | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [dailyConfirmOpen, setDailyConfirmOpen] = useState(false);
  const [dailyDate, setDailyDate] = useState(today);
  const [busy, setBusy] = useState("");
  const request = useRef(0);

  const loadPool = useCallback(async () => {
    try {
      const result = await quizApi.poolInfo();
      setPool(result.data);
      setPoolError("");
    } catch (reason) {
      setPoolError(reason instanceof Error ? reason.message : "Daily pool information could not be loaded.");
    }
  }, []);

  const load = useCallback(async () => {
    const requestId = ++request.current;
    const [listResult, metaResult, poolResult] = await Promise.allSettled([quizApi.list({ page, limit: PAGE_SIZE }), quizApi.meta(), quizApi.poolInfo()]);
    if (requestId !== request.current) return;
    if (listResult.status === "fulfilled") {
      setQuestions(listResult.value.data);
      setCounts(listResult.value.counts ?? {});
      setPagination(listResult.value.pagination ? { page: listResult.value.pagination.page, totalPages: listResult.value.pagination.totalPages, total: listResult.value.pagination.total } : null);
      setError("");
    } else setError(listResult.reason instanceof Error ? listResult.reason.message : "Quiz questions could not be loaded.");
    if (metaResult.status === "fulfilled") { setMeta(metaResult.value); setMetaError(""); }
    else setMetaError(metaResult.reason instanceof Error ? metaResult.reason.message : "Quiz metadata could not be loaded.");
    if (poolResult.status === "fulfilled") { setPool(poolResult.value.data); setPoolError(""); }
    else setPoolError(poolResult.reason instanceof Error ? poolResult.reason.message : "Daily pool information could not be loaded.");
    setLoading(false);
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); request.current += 1; };
  }, [load]);

  const filtered = useMemo(() => questions.filter((question) => {
    if (levelFilter !== "all" && String(question.level) !== levelFilter) return false;
    if (difficultyFilter !== "all" && question.difficulty !== difficultyFilter) return false;
    if (statusFilter === "active" && !isActive(question)) return false;
    if (statusFilter === "inactive" && isActive(question)) return false;
    return true;
  }), [difficultyFilter, levelFilter, questions, statusFilter]);

  const visible = useMemo(() => pagination ? filtered : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page, pagination]);
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentIds = visible.flatMap((question) => { const id = idOf(question); return id ? [id] : []; });
  const allCurrentSelected = currentIds.length > 0 && currentIds.every((id) => bankSelected.includes(id));
  const eligibleDaily = visible.filter((question) => idOf(question) && isActive(question));

  const setFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };

  const toggleCurrentPage = () => {
    setBankSelected((current) => allCurrentSelected ? current.filter((id) => !currentIds.includes(id)) : [...new Set([...current, ...currentIds])]);
  };

  const openEdit = async (question: QuizQuestion) => {
    const id = idOf(question);
    if (!id) return;
    setBusy(id);
    try {
      const canonical = (await quizApi.get(id)).data;
      setEditing(canonical);
      setQuestionOpen(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Question details could not be loaded.");
    } finally {
      setBusy("");
    }
  };

  const toggleActive = async (question: QuizQuestion) => {
    const id = idOf(question);
    if (!id) return;
    const activating = !isActive(question);
    setBusy(id);
    try {
      if (activating) await quizApi.activate(id); else await quizApi.deactivate(id);
      toast.success("Question " + (activating ? "activated." : "deactivated."));
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Question status could not be changed.");
    } finally {
      setBusy("");
    }
  };

  const removeOne = async () => {
    const id = deleteTarget ? idOf(deleteTarget) : "";
    if (!id) return;
    setBusy("delete");
    try {
      await quizApi.remove(id);
      setBankSelected((current) => current.filter((value) => value !== id));
      setDailySelected((current) => current.filter((value) => value !== id));
      toast.success("Question deleted.");
      setDeleteTarget(null);
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The question could not be deleted.");
    } finally {
      setBusy("");
    }
  };

  const removeBulk = async () => {
    if (!bankSelected.length) return;
    setBusy("bulk-delete");
    try {
      const result = await quizApi.removeBulk(bankSelected);
      const deleted = typeof result.metadata?.deleted === "number" ? result.metadata.deleted : bankSelected.length;
      toast.success(String(deleted) + " selected question" + (deleted === 1 ? "" : "s") + " deleted.");
      setBankSelected([]);
      setBulkDeleteOpen(false);
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Selected questions could not be deleted.");
    } finally {
      setBusy("");
    }
  };

  const addToPool = async () => {
    if (!dailySelected.length) { toast.error("Select at least one eligible question."); return; }
    setBusy("pool");
    try {
      const result = await quizApi.addToPool(dailySelected);
      toast.success(result.message ?? "Selected questions added to the daily pool.");
      await loadPool();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Questions could not be added to the daily pool.");
    } finally {
      setBusy("");
    }
  };

  const setDaily = async () => {
    if (!dailySelected.length || !dailyDate) return;
    setBusy("daily");
    try {
      const result = await quizApi.setDaily(dailyDate, dailySelected);
      toast.success(result.message ?? "Daily quiz set for " + dailyDate + ".");
      setDailyConfirmOpen(false);
      await loadPool();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The daily quiz could not be set.");
    } finally {
      setBusy("");
    }
  };

  return <div className="space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Quiz" description="Manage the question bank and schedule the daily quiz." action={tab === "bank" ? <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setBulkOpen(true)}><HiOutlineSquaresPlus className="h-5 w-5" />Bulk create</Button><Button onClick={() => { setEditing(null); setQuestionOpen(true); }}><HiOutlinePlus className="h-5 w-5" />Create question</Button></div> : undefined} /></PageSection>

    <PageSection delay={.04} className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Backend total" value={counts.total ?? pagination?.total ?? questions.length} icon={<HiOutlineAcademicCap className="h-5 w-5 text-[var(--color-primary)]" />} />
      <StatCard label="Backend active" value={counts.active ?? "Not supplied"} />
      <StatCard label="Backend inactive" value={counts.inactive ?? "Not supplied"} />
    </PageSection>

    <PageSection delay={.08} className="space-y-4">
      <div className="grid grid-cols-2 rounded-xl bg-[var(--color-surface-muted)] p-1 sm:max-w-md">{(["bank", "daily"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={"min-h-11 cursor-pointer rounded-lg px-4 text-sm font-medium " + (tab === item ? "bg-[var(--color-surface)] text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>{item === "bank" ? "Question Bank" : "Daily Quiz"}</button>)}</div>

      {tab === "bank" ? <>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <Filter label="Level" value={levelFilter} onChange={(value) => setFilter(setLevelFilter, value)} options={meta.levels.map((level) => ({ value: String(level), label: "Level " + level }))} />
          <Filter label="Difficulty" value={difficultyFilter} onChange={(value) => setFilter(setDifficultyFilter, value)} options={meta.difficulties.map((difficulty) => ({ value: difficulty, label: difficulty }))} />
          <Filter label="Status" value={statusFilter} onChange={(value) => setFilter((next) => setStatusFilter(next as StatusFilter), value)} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          <div className="ml-auto flex flex-wrap items-center gap-3"><span className="text-sm text-[var(--color-muted)]">{bankSelected.length} selected</span><Button variant="danger" onClick={() => setBulkDeleteOpen(true)} disabled={!bankSelected.length}><HiOutlineTrash className="h-4 w-4" />Delete selected</Button></div>
        </div>
        {metaError && <p role="alert" className="rounded-xl bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-warning)]">{metaError} Manual level and difficulty fields remain available.</p>}
        {loading ? <QuizSkeleton /> : error ? <ErrorState description={error} onRetry={() => { setLoading(true); void load(); }} /> : visible.length ? <QuestionList questions={visible} selected={bankSelected} allSelected={allCurrentSelected} busy={busy} onToggleAll={toggleCurrentPage} onToggle={(id, checked) => setBankSelected((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id))} onEdit={(question) => void openEdit(question)} onToggleActive={(question) => void toggleActive(question)} onDelete={setDeleteTarget} /> : <EmptyState title="No questions found" description="Adjust the loaded-result filters or create a question." action={<Button onClick={() => { setEditing(null); setQuestionOpen(true); }}>Create question</Button>} />}
      </> : <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] p-4"><h3 className="font-semibold">Eligible loaded questions</h3><p className="mt-1 text-sm text-[var(--color-muted)]">Daily selection is separate from bulk-delete selection. Only active questions on this page are shown.</p></div>
          {loading ? <div className="space-y-3 p-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : eligibleDaily.length ? <div className="divide-y divide-[var(--color-border)]">{eligibleDaily.map((question) => { const id = idOf(question); return <label key={id} className="flex min-h-16 cursor-pointer items-start gap-3 p-4 hover:bg-[var(--color-surface-muted)]"><Checkbox checked={dailySelected.includes(id)} onChange={(event) => setDailySelected((current) => event.target.checked ? [...new Set([...current, id])] : current.filter((value) => value !== id))} /><span className="min-w-0"><span className="block font-medium">{question.question}</span><span className="mt-1 block text-xs text-[var(--color-muted)]">Level {question.level} · {question.difficulty}</span></span></label>; })}</div> : <div className="p-6 text-sm text-[var(--color-muted)]">No active questions are available on this page.</div>}
        </section>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div className="flex items-center gap-2"><HiOutlineCalendarDays className="h-5 w-5 text-[var(--color-primary)]" /><h3 className="font-semibold">Daily pool</h3></div><p className="mt-3 text-3xl font-semibold">{poolSize(pool) ?? "Not supplied"}</p><p className="mt-1 text-sm text-[var(--color-muted)]">Questions reported by the pool endpoint</p>{poolError && <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">{poolError}</p>}<Button variant="secondary" className="mt-4 w-full" onClick={() => void loadPool()}>Refresh pool</Button></section>
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h3 className="font-semibold">Schedule selection</h3><p className="mt-1 text-sm text-[var(--color-muted)]">{dailySelected.length} question{dailySelected.length === 1 ? "" : "s"} selected</p><label className="mt-4 block text-sm font-medium">Date<input type="date" value={dailyDate} onChange={(event) => setDailyDate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-soft)]" /></label><div className="mt-4 space-y-2"><Button variant="secondary" className="w-full" onClick={() => void addToPool()} loading={busy === "pool"} disabled={!dailySelected.length}>Add to daily pool</Button><Button className="w-full" onClick={() => setDailyConfirmOpen(true)} disabled={!dailySelected.length || !dailyDate}>Set daily quiz</Button></div></section>
        </aside>
      </div>}
      <Pagination page={page} totalPages={totalPages} onPageChange={(next) => { request.current += 1; setLoading(true); setPage(next); }} />
    </PageSection>

    <QuizQuestionModal open={questionOpen} question={editing} meta={meta} onClose={() => setQuestionOpen(false)} onSaved={() => { setQuestionOpen(false); setLoading(true); void load(); }} />
    <BulkQuizModal open={bulkOpen} onClose={() => setBulkOpen(false)} onSaved={() => { setBulkOpen(false); setLoading(true); void load(); }} />
    <ConfirmModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={removeOne} pending={busy === "delete"} title="Delete question?" description={"Delete \"" + (deleteTarget?.question ?? "this question") + "\"? This cannot be undone."} confirmLabel="Delete question" />
    <ConfirmModal open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={removeBulk} pending={busy === "bulk-delete"} title="Delete selected questions?" description={"Delete " + bankSelected.length + " selected question" + (bankSelected.length === 1 ? "" : "s") + "? This cannot be undone."} confirmLabel="Delete selected" />
    <ConfirmModal open={dailyConfirmOpen} onClose={() => setDailyConfirmOpen(false)} onConfirm={setDaily} pending={busy === "daily"} danger={false} title="Set daily quiz?" description={"Use " + dailySelected.length + " selected question" + (dailySelected.length === 1 ? "" : "s") + " for " + dailyDate + "?"} confirmLabel="Set daily quiz" />
  </div>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="text-sm font-medium">{label}<Select className="mt-2 min-w-36" value={value} onChange={(event) => onChange(event.target.value)}><option value="all">All</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>;
}

function QuestionList({ questions, selected, allSelected, busy, onToggleAll, onToggle, onEdit, onToggleActive, onDelete }: { questions: QuizQuestion[]; selected: string[]; allSelected: boolean; busy: string; onToggleAll: () => void; onToggle: (id: string, checked: boolean) => void; onEdit: (question: QuizQuestion) => void; onToggleActive: (question: QuizQuestion) => void; onDelete: (question: QuizQuestion) => void }) {
  return <><div className="hidden overflow-visible rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:block"><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><caption className="sr-only">Quiz question bank</caption><thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]"><tr><th className="w-12 px-4 py-3"><Checkbox aria-label="Select all questions on this page" checked={allSelected} onChange={onToggleAll} /></th><th className="px-4 py-3 font-medium">Question</th><th className="px-4 py-3 font-medium">Correct answer</th><th className="px-4 py-3 font-medium">Level</th><th className="px-4 py-3 font-medium">Difficulty</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{questions.map((question) => { const id = idOf(question); return <tr key={id || question.question}><td className="px-4 py-3"><Checkbox aria-label={"Select " + question.question} disabled={!id} checked={Boolean(id && selected.includes(id))} onChange={(event) => onToggle(id, event.target.checked)} /></td><td className="max-w-md px-4 py-3"><p className="line-clamp-2 font-medium">{question.question}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{question.options.join(" · ")}</p></td><td className="max-w-44 truncate px-4 py-3">{answerOf(question)}</td><td className="px-4 py-3">{question.level}</td><td className="px-4 py-3 capitalize">{question.difficulty}</td><td className="px-4 py-3"><StatusPill tone={isActive(question) ? "success" : "neutral"}>{isActive(question) ? "Active" : "Inactive"}</StatusPill></td><td className="px-4 py-3 text-right"><QuestionActions question={question} disabled={!id || busy === id} onEdit={() => onEdit(question)} onToggle={() => onToggleActive(question)} onDelete={() => onDelete(question)} /></td></tr>; })}</tbody></table></div></div><div className="grid gap-3 md:hidden">{questions.map((question) => { const id = idOf(question); return <article key={id || question.question} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="flex items-start gap-3"><Checkbox aria-label={"Select " + question.question} disabled={!id} checked={Boolean(id && selected.includes(id))} onChange={(event) => onToggle(id, event.target.checked)} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-3 font-medium">{question.question}</h3><QuestionActions question={question} disabled={!id || busy === id} onEdit={() => onEdit(question)} onToggle={() => onToggleActive(question)} onDelete={() => onDelete(question)} /></div><p className="mt-2 text-sm text-[var(--color-muted)]">Answer: {answerOf(question)}</p><div className="mt-3 flex flex-wrap gap-2"><StatusPill tone={isActive(question) ? "success" : "neutral"}>{isActive(question) ? "Active" : "Inactive"}</StatusPill><StatusPill>Level {question.level}</StatusPill><StatusPill>{question.difficulty}</StatusPill></div></div></div></article>; })}</div></>;
}

function QuestionActions({ question, disabled, onEdit, onToggle, onDelete }: { question: QuizQuestion; disabled: boolean; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  return <details className="relative inline-block text-left"><summary aria-label={"Actions for " + question.question} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"><HiOutlineEllipsisVertical className="h-5 w-5" /></summary><div className="absolute right-0 z-30 mt-2 w-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm"><button disabled={disabled} onClick={onEdit} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">Edit</button><button disabled={disabled} onClick={onToggle} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">{isActive(question) ? "Deactivate" : "Activate"}</button><button disabled={disabled} onClick={onDelete} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed">Delete</button></div></details>;
}

function QuizSkeleton() {
  return <div className="space-y-3"><Skeleton className="h-14 w-full" />{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
}
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type ChatResponse,
  type CheckinResponse,
  type Mood,
  type PlanExercise,
} from "@/lib/api";
import {
  BLEEDING_OPTIONS,
  ENERGY_OPTIONS,
  EQUIPMENT,
  MOODS,
  MUSCLE_ZH,
  RED_FLAGS,
  SLEEP_OPTIONS,
  SORENESS_OPTIONS,
  STRESS_OPTIONS,
  SYMPTOMS,
} from "@/lib/constants";
import { errorMessage, videoUrl } from "@/lib/utils";
import { useProfile } from "@/lib/useProfile";
import {
  Card,
  ChipGroup,
  EmptyState,
  ErrorBanner,
  Field,
  inputCls,
  LoadingState,
  LinkButton,
  PageHero,
  PillButton,
  ProgressRing,
  SectionHeading,
  Tag,
} from "@/components/ui";

function todayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function mainExercises(result: CheckinResponse | null): PlanExercise[] {
  if (!result || result.status !== "ok") return [];
  return result.plan.blocks.flatMap((block) => block.exercises || []);
}

export default function Today() {
  const { profile, loading, error: profileError } = useProfile();
  const [diary, setDiary] = useState("");
  const [mood, setMood] = useState<Mood>("ok");
  const [energy, setEnergy] = useState("3");
  const [sleep, setSleep] = useState("7");
  const [soreness, setSoreness] = useState("0");
  const [stress, setStress] = useState("3");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [bleeding, setBleeding] = useState("none");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [pain, setPain] = useState("none");
  const [minutes, setMinutes] = useState(40);
  const [flags, setFlags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckinResponse | null>(null);

  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});
  const [restSeconds, setRestSeconds] = useState(0);
  const [rpe, setRpe] = useState("");
  const [painAfter, setPainAfter] = useState("none");
  const [moodAfter, setMoodAfter] = useState<Mood>("ok");
  const [satisfaction, setSatisfaction] = useState(3);
  const [stopReason, setStopReason] = useState("completed");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "coach"; text: string }[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatChange, setChatChange] = useState<Record<string, unknown> | null>(null);
  const [chatPreview, setChatPreview] = useState<ChatResponse["preview"]>(null);

  useEffect(() => {
    if (profile) {
      setEquipment(profile.equipment);
      setMinutes(profile.session_minutes);
    }
  }, [profile]);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRestSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const exercises = useMemo(() => mainExercises(result), [result]);
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const doneSets = exercises.reduce(
    (sum, exercise) => sum + Math.min(completedSets[exercise.exercise_id] || 0, exercise.sets),
    0,
  );
  const completion = totalSets ? doneSets / totalSets : 0;
  const okResult = result?.status === "ok" ? result : null;

  if (loading) return <LoadingState label="正在读取你的私有档案" />;
  if (!profile) {
    return (
      <EmptyState
        title="先建立你的训练底图"
        description={profileError || "只需三步，确认适用范围、训练限制与可选敏感数据授权。"}
        action={<LinkButton href="/onboarding">开始建档</LinkButton>}
      />
    );
  }

  const submitCheckin = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    setWorkoutStarted(false);
    setCompletedSets({});
    setFeedbackDone(false);
    try {
      const response = await api.checkin({
        profile_id: profile.profile_id,
        available_minutes: minutes,
        energy: Number(energy),
        sleep_hours: Number(sleep),
        soreness: Number(soreness),
        stress: Number(stress),
        pain,
        mood: profile.mood_consent ? mood : "ok",
        symptoms,
        bleeding: profile.cycle_consent ? bleeding : "none",
        diary: profile.mood_consent ? diary : null,
        equipment,
        red_flags: flags,
      });
      setResult(response);
      if (response.status === "ok") {
        window.setTimeout(() => document.getElementById("today-plan")?.scrollIntoView({ behavior: "smooth" }), 80);
      }
    } catch (reason) {
      setError(errorMessage(reason, "计划生成失败"));
    } finally {
      setBusy(false);
    }
  };

  const toggleSet = (exercise: PlanExercise, index: number) => {
    const current = completedSets[exercise.exercise_id] || 0;
    const next = current > index ? index : index + 1;
    setCompletedSets((state) => ({ ...state, [exercise.exercise_id]: next }));
    if (next > current) setRestSeconds(exercise.rest_sec);
  };

  const submitFeedback = async () => {
    if (!okResult) return;
    setFeedbackBusy(true);
    setError("");
    try {
      const elapsed = startedAt
        ? Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 60000))
        : null;
      await api.feedback({
        plan_id: okResult.plan_id,
        completion,
        rpe: rpe ? Number(rpe) : null,
        pain_after: painAfter,
        mood_after: profile.mood_consent ? moodAfter : "ok",
        satisfaction,
        stop_reason: completion >= 1 ? "completed" : stopReason,
        duration_min: elapsed,
        started_at: startedAt?.toISOString() || null,
        exercise_logs: exercises.map((exercise) => ({
          exercise_id: exercise.exercise_id,
          completed_sets: completedSets[exercise.exercise_id] || 0,
          target_sets: exercise.sets,
          actual_reps: [],
          skipped: (completedSets[exercise.exercise_id] || 0) === 0,
        })),
      });
      setFeedbackDone(true);
    } catch (reason) {
      setError(errorMessage(reason, "反馈提交失败"));
    } finally {
      setFeedbackBusy(false);
    }
  };

  const sendChat = async () => {
    const message = chatInput.trim();
    if (!message || !okResult) return;
    setChatMessages((items) => [...items, { role: "user", text: message }]);
    setChatInput("");
    setChatBusy(true);
    setChatChange(null);
    setChatPreview(null);
    try {
      const response = await api.chat({
        profile_id: profile.profile_id,
        plan_id: okResult.plan_id,
        message,
      });
      setChatMessages((items) => [...items, { role: "coach", text: response.reply }]);
      setChatChange(response.change);
      setChatPreview(response.preview);
    } catch (reason) {
      setChatMessages((items) => [
        ...items,
        { role: "coach", text: errorMessage(reason, "教练暂时无法响应") },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  const applyChat = async () => {
    if (!chatChange || !okResult) return;
    setChatBusy(true);
    try {
      const response = await api.chatApply({
        profile_id: profile.profile_id,
        plan_id: okResult.plan_id,
        change: chatChange,
      });
      setResult((current) => {
        if (!current || current.status !== "ok") return current;
        return {
          ...current,
          plan_id: response.plan_id,
          plan: {
            ...current.plan,
            blocks: response.blocks,
            duration_min: response.duration_min,
            rationale: response.rationale,
          },
        };
      });
      setCompletedSets({});
      setChatMessages((items) => [...items, { role: "coach", text: "新计划已通过校验并应用。" }]);
      setChatChange(null);
      setChatPreview(null);
    } catch (reason) {
      setChatMessages((items) => [
        ...items,
        { role: "coach", text: errorMessage(reason, "没有应用这个调整，原计划保持不变") },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="animate-rise">
      <PageHero
        eyebrow="Daily · 今日"
        title={profile.display_name ? `${profile.display_name}，今天` : "今天"}
        accent="听身体的"
        description="先看安全、疼痛与恢复，再看心情和周期背景。你始终可以少练、替换或休息。"
        aside={
          <div className="hero-inset w-full rounded-[20px] bg-cream p-5">
            <div className="eyebrow">Today</div>
            <div className="font-display mt-3 text-3xl text-ink">{todayLabel()}</div>
            <div className="mt-8 flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-ink" />
              <span className="text-sm text-charcoal">状态优先，周期只作背景</span>
            </div>
          </div>
        }
      />

      <div className="page-shell grid gap-3 pb-12 md:grid-cols-[.82fr_1.18fr]">
        <Card tint="bg-sage" className="self-start">
          <SectionHeading eyebrow="01 · Readiness" title="一分钟状态打卡" description="所有选项都可以如实填写，没有“应该更好”的答案。" />
          <div className="stagger mt-7 space-y-6">
            <Field label="能量">
              <ChipGroup options={ENERGY_OPTIONS} value={[energy]} onChange={(items) => setEnergy(items[0] || "3")} single />
            </Field>
            <Field label="睡眠">
              <ChipGroup options={SLEEP_OPTIONS} value={[sleep]} onChange={(items) => setSleep(items[0] || "7")} single />
            </Field>
            <Field label="肌肉酸痛">
              <ChipGroup options={SORENESS_OPTIONS} value={[soreness]} onChange={(items) => setSoreness(items[0] || "0")} single />
            </Field>
            <Field label="压力">
              <ChipGroup options={STRESS_OPTIONS} value={[stress]} onChange={(items) => setStress(items[0] || "3")} single />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="疼痛 / 不适">
                <select className={inputCls()} value={pain} onChange={(event) => setPain(event.target.value)}>
                  <option value="none">无</option>
                  <option value="mild">轻微</option>
                  <option value="moderate">中等</option>
                </select>
              </Field>
              <Field label="今天可用时间">
                <select className={inputCls()} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
                  {[10, 15, 20, 30, 40, 50, 60, 75, 90].map((value) => (
                    <option key={value} value={value}>{value} 分钟</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="今天可用器械" hint="不选表示徒手。">
              <ChipGroup options={EQUIPMENT} value={equipment} onChange={setEquipment} />
            </Field>
          </div>
        </Card>

        <div className="space-y-3">
          <Card tint="bg-keylime">
            <SectionHeading eyebrow="02 · Context" title="症状与心情" description="显式症状优先于日历阶段；日记永远不做自动情绪分析。" />
            <div className="stagger mt-7 space-y-6">
              <Field label="今天有哪些常见不适？">
                <ChipGroup options={SYMPTOMS} value={symptoms} onChange={setSymptoms} />
              </Field>
              {profile.cycle_consent && (
                <Field label="今天的出血情况">
                  <ChipGroup options={BLEEDING_OPTIONS} value={[bleeding]} onChange={(items) => setBleeding(items[0] || "none")} single />
                </Field>
              )}
              {profile.mood_consent ? (
                <>
                  <Field label="此刻心情（由你选择）">
                    <ChipGroup options={MOODS} value={[mood]} onChange={(items) => setMood((items[0] || "ok") as Mood)} single />
                  </Field>
                  <Field label="私密备注（可选）" hint="仅保存供你回看；不会发送给 AI，也不会用于自动判断心情。">
                    <textarea
                      className={`${inputCls()} min-h-28 resize-y leading-6`}
                      value={diary}
                      maxLength={2000}
                      placeholder="写下今天想记住的事…"
                      onChange={(event) => setDiary(event.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <div className="rounded-[14px] bg-cream p-4 text-sm leading-6 text-moss">
                  你没有开启情绪数据授权，本次计划不会使用或保存情绪与日记。
                </div>
              )}
            </div>
          </Card>

          <Card tint="bg-cream-2">
            <details>
              <summary className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-ink">安全症状筛查</div>
                  <p className="mt-1 text-xs text-moss">如命中，系统会停止生成训练并建议寻求专业帮助。</p>
                </div>
                <span className="details-chevron text-2xl text-ink transition-transform">+</span>
              </summary>
              <div className="mt-5">
                <ChipGroup options={RED_FLAGS} value={flags} onChange={setFlags} />
              </div>
            </details>
          </Card>

          {error && <ErrorBanner message={error} />}
          <PillButton onClick={submitCheckin} disabled={busy} className="w-full py-3.5 text-base">
            {busy ? "正在通过安全规则生成…" : "生成今日计划 →"}
          </PillButton>
        </div>
      </div>

      {result?.status === "safety_stop" && (
        <div id="today-plan" className="page-shell pb-14">
          <Card tint="bg-danger/8">
            <Tag tone="cream">安全优先</Tag>
            <h2 className="font-display mt-4 text-4xl text-danger">今天先不要训练</h2>
            {result.red_flags.map((flag) => (
              <p key={flag.code} className="mt-3 text-sm leading-6 text-danger">{flag.message}</p>
            ))}
            <p className="mt-5 text-xs text-moss">若症状严重、持续或令你担忧，请尽快联系专业医疗人员或急救服务。</p>
          </Card>
        </div>
      )}

      {okResult && (
        <div id="today-plan" className="page-shell space-y-3 pb-16">
          <div className="grid gap-3 lg:grid-cols-[.72fr_1.28fr]">
            <Card tint="bg-slate" className="flex flex-col items-center justify-center text-center">
              <ProgressRing value={okResult.readiness.score} label="准备度" />
              <h2 className="font-display mt-4 text-3xl text-ink">{okResult.readiness.label}</h2>
              <p className="mt-2 text-sm leading-6 text-charcoal/75">{okResult.readiness.adjust}</p>
            </Card>
            <Card tint="bg-keylime">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionHeading eyebrow="03 · Your plan" title={okResult.plan.mode === "rest" ? "今天先恢复" : `${okResult.plan.duration_min} 分钟训练`} />
                <Tag tone={okResult.plan.validation_status === "pass" ? "ink" : "cream"}>
                  {okResult.plan.validation_status === "pass" ? "安全校验通过" : "保守兜底"}
                </Tag>
              </div>
              <p className="mt-5 text-sm leading-6 text-charcoal">{okResult.rationale_text}</p>
              {okResult.comfort_msg && (
                <div className="mt-5 rounded-[14px] bg-cream p-4">
                  <p className="font-display text-2xl text-ink">{okResult.comfort_msg}</p>
                  <p className="mt-2 text-xs leading-5 text-moss">{okResult.rest_suggestion}</p>
                </div>
              )}
              <details className="mt-5 border-t border-ink/10 pt-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-ink">
                  置信度 {Math.round(okResult.confidence * 100)}% 是怎么来的？
                  <span className="details-chevron text-xl transition-transform">+</span>
                </summary>
                <ul className="mt-3 space-y-1.5 text-xs leading-5 text-moss">
                  {okResult.confidence_factors.map((factor) => <li key={factor}>· {factor}</li>)}
                </ul>
              </details>
            </Card>
          </div>

          <div className="stagger grid gap-3 lg:grid-cols-3">
            {okResult.plan.blocks.map((block) => (
              <Card key={`${block.type}-${block.title}`} tint={block.type === "main" ? "bg-cream-2 lg:col-span-2" : "bg-sage"}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-3xl text-ink">{block.title}</h3>
                  {block.duration_min && <Tag tone="cream">{block.duration_min} 分钟</Tag>}
                </div>
                {block.items?.map((item) => <p key={item} className="mt-4 text-sm leading-6 text-charcoal/80">{item}</p>)}
                {block.exercises && (
                  <div className="mt-5 space-y-2">
                    {block.exercises.map((exercise) => (
                      <article key={exercise.exercise_id} className="rounded-[14px] bg-cream p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-medium text-ink">{exercise.name_zh}</h4>
                            <p className="mt-0.5 text-xs text-moss">{exercise.name_en}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {exercise.primary_muscles.map((muscle) => (
                                <Tag key={muscle}>{MUSCLE_ZH[muscle] || muscle}</Tag>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-display text-2xl text-ink">{exercise.sets} × {exercise.reps}</div>
                            <div className="text-xs text-moss">RPE {exercise.rpe} · 休 {exercise.rest_sec}s</div>
                          </div>
                        </div>
                        <a href={videoUrl(exercise.name_zh)} target="_blank" rel="noreferrer"
                          className="interactive mt-3 inline-flex rounded-[7px] bg-keylime px-3 py-2 text-xs font-medium text-ink">
                          查看动作教学 ↗
                        </a>
                      </article>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {exercises.length > 0 && (
            <Card tint="bg-slate">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionHeading eyebrow="04 · Workout" title={workoutStarted ? "逐组完成今天的训练" : "准备开始训练"} description="可随时停止；部分完成会被如实保存，不会伪装成完成。" />
                {workoutStarted && (
                  <div className="rounded-[14px] bg-cream p-3 text-center">
                    <div className="font-display text-3xl text-ink">{doneSets}/{totalSets}</div>
                    <div className="text-[10px] uppercase tracking-wider text-moss">sets</div>
                  </div>
                )}
              </div>
              {!workoutStarted ? (
                <PillButton className="mt-6" onClick={() => { setWorkoutStarted(true); setStartedAt(new Date()); }}>
                  开始训练 →
                </PillButton>
              ) : (
                <>
                  {restSeconds > 0 && (
                    <div className="sticky top-20 z-10 mt-6 flex items-center justify-between rounded-[14px] bg-ink px-5 py-3 text-cream">
                      <span className="text-sm">组间休息</span>
                      <button type="button" className="font-display text-2xl" onClick={() => setRestSeconds(0)}>
                        {restSeconds}s · 跳过
                      </button>
                    </div>
                  )}
                  <div className="mt-6 space-y-3">
                    {exercises.map((exercise) => {
                      const completed = completedSets[exercise.exercise_id] || 0;
                      return (
                        <article key={exercise.exercise_id} className="rounded-[14px] bg-cream p-4 md:p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="font-medium text-ink">{exercise.name_zh}</h4>
                              <p className="mt-1 text-xs text-moss">{exercise.reps} 次 · RPE {exercise.rpe}</p>
                            </div>
                            <div className="flex gap-2" aria-label={`${exercise.name_zh} 完成组数`}>
                              {Array.from({ length: exercise.sets }, (_, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => toggleSet(exercise, index)}
                                  aria-label={`第 ${index + 1} 组`}
                                  aria-pressed={completed > index}
                                  className={`interactive flex h-10 w-10 items-center justify-center rounded-full border text-sm ${completed > index
                                    ? "animate-check border-ink bg-ink text-cream"
                                    : "border-frost bg-cream-2 text-moss"}`}
                                >
                                  {completed > index ? "✓" : index + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <Card tint="bg-keylime">
              <SectionHeading eyebrow="Coach · 可选" title="让教练调整计划" description="只会看到结构化训练信息，不会读取日记、备注或精确经期日期；修改先预览、再应用。" />
              <details className="mt-4 rounded-[14px] bg-cream p-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-ink">
                  查看教练会看到什么
                  <span className="details-chevron text-xl transition-transform">+</span>
                </summary>
                <div className="mt-3 space-y-2 text-xs leading-5 text-moss">
                  {okResult.context_disclosure.used.map((item) => <p key={item}>· {item}</p>)}
                  <p className="font-medium text-ink">不会发送：{okResult.context_disclosure.never_sent_to_ai.join("、")}</p>
                </div>
              </details>
              <div className="mt-4 space-y-2" aria-live="polite">
                {chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`rounded-[14px] px-4 py-3 text-sm leading-6 ${message.role === "user"
                    ? "ml-8 bg-ink text-cream"
                    : "mr-8 bg-cream text-charcoal"}`}>
                    {message.text}
                  </div>
                ))}
                {chatBusy && <p className="text-xs text-moss">正在检查可执行的调整…</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  className={inputCls()}
                  value={chatInput}
                  placeholder="例如：缩短到 20 分钟、改成徒手"
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void sendChat(); }}
                />
                <PillButton variant="soft" disabled={chatBusy} onClick={sendChat}>发送</PillButton>
              </div>
              {chatPreview && (
                <div className="mt-4 rounded-[14px] bg-cream p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">通过校验的预览</span>
                    <Tag tone="ink">{chatPreview.duration_min} 分钟</Tag>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-moss">
                    {chatPreview.blocks.flatMap((block) => block.exercises || []).map((exercise) => exercise.name_zh).join("、")}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <PillButton onClick={applyChat}>应用调整</PillButton>
                    <PillButton variant="ghost" onClick={() => { setChatChange(null); setChatPreview(null); }}>保留原计划</PillButton>
                  </div>
                </div>
              )}
            </Card>

            <Card tint="bg-sage">
              <SectionHeading eyebrow="05 · Feedback" title="训练后如实记录" description="即使只做了一部分，也是一条有效记录。" />
              {feedbackDone ? (
                <div className="mt-8 rounded-[14px] bg-cream p-6 text-center">
                  <div className="font-display text-4xl text-ink">已保存</div>
                  <p className="mt-2 text-sm text-moss">这些反馈会帮助下一次计划更贴近你。</p>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="整体 RPE（可空）">
                      <input className={inputCls()} type="number" min={1} max={10} value={rpe}
                        onChange={(event) => setRpe(event.target.value)} />
                    </Field>
                    <Field label="满意度">
                      <select className={inputCls()} value={satisfaction} onChange={(event) => setSatisfaction(Number(event.target.value))}>
                        {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                      </select>
                    </Field>
                    <Field label="训练后疼痛">
                      <select className={inputCls()} value={painAfter} onChange={(event) => setPainAfter(event.target.value)}>
                        <option value="none">无</option>
                        <option value="mild">轻微</option>
                        <option value="moderate">中等</option>
                      </select>
                    </Field>
                    {profile.mood_consent && (
                      <Field label="训练后心情">
                        <select className={inputCls()} value={moodAfter} onChange={(event) => setMoodAfter(event.target.value as Mood)}>
                          {MOODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </Field>
                    )}
                  </div>
                  {completion < 1 && (
                    <Field label="提前结束原因">
                      <select className={inputCls()} value={stopReason} onChange={(event) => setStopReason(event.target.value)}>
                        <option value="time">时间不够</option>
                        <option value="fatigue">疲劳</option>
                        <option value="pain">疼痛 / 不适</option>
                        <option value="other">其他</option>
                      </select>
                    </Field>
                  )}
                  <div className="rounded-[14px] bg-cream p-4 text-sm text-moss">
                    当前完成度：<span className="font-medium text-ink">{Math.round(completion * 100)}%</span>
                  </div>
                  <PillButton className="w-full" disabled={feedbackBusy} onClick={submitFeedback}>
                    {feedbackBusy ? "正在保存…" : "保存本次训练"}
                  </PillButton>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

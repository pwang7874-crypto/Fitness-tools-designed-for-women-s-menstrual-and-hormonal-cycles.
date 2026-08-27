"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  MOODS, MOOD_EMOJI, RED_FLAGS, MUSCLE_ZH, EQUIPMENT,
  ENERGY_OPTIONS, SLEEP_OPTIONS, SORENESS_OPTIONS,
} from "@/lib/constants";
import { videoUrl } from "@/lib/utils";
import {
  Card, Field, PillButton, ChipGroup, inputCls, ErrorBanner, HeroTitle, Tag, LeafIcon,
} from "@/components/ui";

function todayStr() {
  const d = new Date();
  const w = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${w}`;
}

export default function Today() {
  const [profileId, setProfileId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const [diary, setDiary] = useState("");
  const [energy, setEnergy] = useState("3");
  const [sleep, setSleep] = useState("7");
  const [soreness, setSoreness] = useState("0");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [pain, setPain] = useState("none");
  const [minutes, setMinutes] = useState(40);
  const [flags, setFlags] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<any>(null);

  const [completion, setCompletion] = useState(1);
  const [rpe, setRpe] = useState("");
  const [painAfter, setPainAfter] = useState("none");
  const [moodAfter, setMoodAfter] = useState("ok");
  const [satisfaction, setSatisfaction] = useState(3);
  const [fbBusy, setFbBusy] = useState(false);
  const [fbDone, setFbDone] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<{ role: "u" | "a"; text: string }[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatChange, setChatChange] = useState<any>(null);
  const [chatPreview, setChatPreview] = useState<any>(null);

  useEffect(() => {
    const id = localStorage.getItem("profile_id");
    if (!id) { setReady(true); return; }
    // 校验 profile 是否仍存在（避免“资源不存在”）
    api.profile(+id)
      .then((p) => { setProfileId(+id); setEquipment(p.equipment || []); })
      .catch(() => { localStorage.removeItem("profile_id"); setProfileId(null); })
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  if (!profileId) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-20 text-center">
        <LeafIcon className="mx-auto h-16 w-16" />
        <h1 className="font-display mt-4 text-3xl text-ink">欢迎来到 CycleFit</h1>
        <p className="mt-2 text-sm text-moss">先建立你的档案，我才能给适合你的计划。</p>
        <Link href="/onboarding" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm font-medium text-cream shadow-[var(--shadow-chip)]">
          开始建档
        </Link>
      </div>
    );
  }

  const submitCheckin = async () => {
    setBusy(true);
    setErr("");
    setResult(null);
    setFbDone(false);
    try {
      const r = await api.checkin({
        profile_id: profileId, available_minutes: +minutes, energy: +energy,
        sleep_hours: +sleep, soreness: +soreness, pain, diary, equipment, red_flags: flags,
      });
      setResult(r);
    } catch (e: any) {
      setErr(e.userMessage || "生成失败");
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = async () => {
    if (!result?.plan_id) return;
    setFbBusy(true);
    try {
      await api.feedback({
        plan_id: result.plan_id, completion: +completion,
        rpe: rpe === "" ? null : +rpe, pain_after: painAfter,
        mood_after: moodAfter, satisfaction: +satisfaction,
      });
      setFbDone(true);
    } catch (e: any) {
      setErr(e.userMessage || "反馈提交失败");
    } finally {
      setFbBusy(false);
    }
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !result?.plan_id) return;
    setChatMsgs((m) => [...m, { role: "u", text: msg }]);
    setChatInput("");
    setChatBusy(true);
    setChatChange(null);
    setChatPreview(null);
    try {
      const r = await api.chat({ profile_id: profileId, plan_id: result.plan_id, message: msg });
      setChatMsgs((m) => [...m, { role: "a", text: r.reply }]);
      setChatChange(r.change);
      setChatPreview(r.preview);
    } catch (e: any) {
      setChatMsgs((m) => [...m, { role: "a", text: e.userMessage || "出错了，稍后再试" }]);
    } finally {
      setChatBusy(false);
    }
  };

  const applyChat = async () => {
    if (!chatChange || !result?.plan_id) return;
    setChatBusy(true);
    try {
      const r = await api.chatApply({ profile_id: profileId, plan_id: result.plan_id, change: chatChange });
      setResult((prev: any) => ({
        ...prev,
        plan_id: r.plan_id,
        plan: { ...prev.plan, blocks: r.blocks, duration_min: r.duration_min },
      }));
      setChatMsgs((m) => [...m, { role: "a", text: "已按你的要求更新计划 ✅" }]);
      setChatChange(null);
      setChatPreview(null);
    } catch (e: any) {
      setChatMsgs((m) => [...m, { role: "a", text: e.userMessage || "应用失败" }]);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="animate-rise">
      {/* 浅色 hero：果绿洗 + 衬线大标题 */}
      <section className="bg-keylime/70">
        <div className="mx-auto flex max-w-3xl items-end justify-between px-4 py-8">
          <div>
            <HeroTitle eyebrow="Daily · 今日" lines={[{ text: "今天，听" }, { text: "身体的", accent: true }]} />
            <p className="mt-2 max-w-sm text-sm text-ink/70">
              写几句日记，AI 会读懂你的心情，给你今天的训练和一句提醒。
            </p>
          </div>
          <LeafIcon className="h-16 w-16 shrink-0 opacity-80" />
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-4 px-4">
        {/* 日记：今日页专门的独立板块 */}
        <Card className="mt-4 border-sage">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl text-ink">今日日记</h2>
              <Tag tone="sage">AI 心情识别</Tag>
            </div>
            <span className="text-xs text-moss">{todayStr()}</span>
          </div>
          <textarea
            className="mt-3 min-h-32 w-full resize-none rounded-2xl border border-frost bg-cream px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-meadow"
            placeholder="今天发生了什么？心情怎么样？写几句就好。比如：“今天有点累，工作好多，不太想动，但想动一动可能会好一点。”"
            value={diary}
            onChange={(e) => setDiary(e.target.value)}
          />
          <p className="mt-2 text-xs text-moss">
            写下的日记只会被用来读懂你今天的心情——心情不好时，会给你一句温柔提醒，并建议少练一点。
          </p>
        </Card>

        {/* 身体状态 */}
        <Card>
          <h2 className="font-display text-lg text-ink">身体状态</h2>
          <div className="mt-3 space-y-4">
            <Field label="今天感觉怎么样？">
              <ChipGroup options={ENERGY_OPTIONS} value={[energy]} onChange={(v) => setEnergy(v[0] || "3")} single />
            </Field>
            <Field label="昨晚睡得如何？">
              <ChipGroup options={SLEEP_OPTIONS} value={[sleep]} onChange={(v) => setSleep(v[0] || "7")} single />
            </Field>
            <Field label="肌肉酸痛吗？">
              <ChipGroup options={SORENESS_OPTIONS} value={[soreness]} onChange={(v) => setSoreness(v[0] || "0")} single />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="疼痛 / 不适">
                <select className={inputCls()} value={pain} onChange={(e) => setPain(e.target.value)}>
                  <option value="none">无</option><option value="mild">轻微</option><option value="moderate">中等</option>
                </select>
              </Field>
              <Field label="可用时间（分钟）">
                <input className={inputCls()} type="number" min={10} max={180} value={minutes} onChange={(e) => setMinutes(+e.target.value)} />
              </Field>
            </div>
            <Field label="今天能用什么器械？（不选 = 徒手）">
              <ChipGroup options={EQUIPMENT} value={equipment} onChange={setEquipment} />
            </Field>
            <Field label="红旗症状（如有，系统会停止并建议就医）">
              <ChipGroup options={RED_FLAGS} value={flags} onChange={setFlags} />
            </Field>
          </div>
        </Card>

        {err && <ErrorBanner message={err} />}
        <PillButton onClick={submitCheckin} disabled={busy} className="w-full py-3 text-base">
          {busy ? "正在读懂你的日记…" : "生成今日计划"}
        </PillButton>

        {result?.status === "safety_stop" && (
          <Card tint="bg-danger/5">
            <h2 className="font-display text-xl text-danger">安全提示</h2>
            {result.red_flags.map((f: any) => (
              <p key={f.code} className="mt-2 text-sm text-danger">· {f.message}</p>
            ))}
          </Card>
        )}

        {result?.status === "ok" && (
          <>
            {result.mood && (
              <Card>
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-moss">AI 读懂了你的心情</span>
                  <Tag tone="rose">{MOOD_EMOJI[result.mood.mood] || "😐"} {result.mood.tag}</Tag>
                </div>
                {result.comfort_msg && (
                  <div className="mt-3 rounded-2xl bg-rose-soft p-4">
                    <p className="text-sm font-medium text-rose">❤️ {result.comfort_msg}</p>
                    <p className="mt-1 text-xs text-rose/80">{result.rest_suggestion}</p>
                  </div>
                )}
              </Card>
            )}

            <Card tint="bg-keylime">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg text-ink">准备度</h2>
                <span className="text-xs text-moss">置信度 {result.confidence}</span>
              </div>
              <p className="mt-1 text-sm">
                <span className="font-medium">{result.readiness.label}</span>（{result.readiness.score} 分）· {result.readiness.adjust}
              </p>
            </Card>

            <Card>
              <h2 className="font-display text-lg text-ink">为什么这样安排</h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal">{result.rationale_text}</p>
            </Card>

            {result.plan.blocks.map((b: any, i: number) => (
              <Card key={i}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-lg text-ink">
                    {b.title}
                    {b.duration_min ? <span className="ml-1 text-xs text-moss">约 {b.duration_min} 分钟</span> : null}
                  </h3>
                </div>
                {b.items?.map((it: string, j: number) => (
                  <p key={j} className="mt-2 text-sm text-charcoal">· {it}</p>
                ))}
                {b.exercises?.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {b.exercises.map((e: any, j: number) => (
                      <div key={j} className="flex items-start justify-between gap-3 rounded-2xl border border-frost bg-cream p-3">
                        <div className="min-w-0">
                          <div className="font-medium text-ink">{e.name_zh}</div>
                          <div className="text-xs text-moss">{e.name_en}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {e.primary_muscles?.map((m: string) => (
                              <span key={m} className="rounded-full bg-keylime px-2 py-0.5 text-[11px] text-ink">
                                {MUSCLE_ZH[m] || m}
                              </span>
                            ))}
                            <a href={videoUrl(e.name_zh)} target="_blank" rel="noreferrer"
                               className="ghost-link text-xs font-medium text-rose">
                              ▶ 教学视频
                            </a>
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-sm">
                          <div className="font-display text-lg text-ink">{e.sets}×{e.reps}</div>
                          <div className="text-xs text-moss">RPE {e.rpe} · 休 {e.rest_sec}s</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}

            {/* AI 教练对话 */}
            <Card>
              <h2 className="font-display text-lg text-ink">问问教练</h2>
              <div className="mt-3 space-y-2">
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`rounded-2xl px-3 py-2 text-sm ${m.role === "u" ? "ml-8 bg-keylime" : "mr-8 bg-cream"}`}>
                    {m.text}
                  </div>
                ))}
                {chatBusy && <div className="text-xs text-moss">教练正在想…</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input className={inputCls()} placeholder="比如：帮我把时间缩到 20 分钟 / 换成徒手" value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === "Enter" && sendChat()} />
                <PillButton onClick={sendChat} disabled={chatBusy} variant="soft" className="shrink-0">发送</PillButton>
              </div>
              {chatPreview && (
                <div className="mt-3 rounded-2xl border border-meadow bg-keylime/50 p-3">
                  <div className="text-sm font-medium text-ink">预览新计划（约 {chatPreview.duration_min} 分钟）</div>
                  <div className="mt-1 text-xs text-moss">
                    {chatPreview.blocks.find((b: any) => b.type === "main")?.exercises.map((e: any) => e.name_zh).join("、")}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <PillButton onClick={applyChat} disabled={chatBusy} className="px-4 py-1.5">应用</PillButton>
                    <PillButton onClick={() => { setChatChange(null); setChatPreview(null); }} variant="ghost" className="px-4 py-1.5">保留原计划</PillButton>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="font-display text-lg text-ink">训练反馈</h2>
              {fbDone ? (
                <p className="mt-2 text-sm text-moss">已记录，谢谢你认真照顾自己 🌿</p>
              ) : (
                <>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="完成度（0–1）">
                      <input className={inputCls()} type="number" step={0.1} min={0} max={1} value={completion} onChange={(e) => setCompletion(+e.target.value)} />
                    </Field>
                    <Field label="RPE（1–10，可空）">
                      <input className={inputCls()} type="number" min={1} max={10} value={rpe} onChange={(e) => setRpe(e.target.value)} />
                    </Field>
                    <Field label="训练后疼痛">
                      <select className={inputCls()} value={painAfter} onChange={(e) => setPainAfter(e.target.value)}>
                        <option value="none">无</option><option value="mild">轻微</option><option value="moderate">中等</option>
                      </select>
                    </Field>
                    <Field label="训练后心情">
                      <select className={inputCls()} value={moodAfter} onChange={(e) => setMoodAfter(e.target.value)}>
                        {MOODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </Field>
                    <Field label="满意度（1–5）">
                      <input className={inputCls()} type="number" min={1} max={5} value={satisfaction} onChange={(e) => setSatisfaction(+e.target.value)} />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <PillButton onClick={submitFeedback} disabled={fbBusy} className="w-full">
                      {fbBusy ? "提交中…" : "提交反馈"}
                    </PillButton>
                  </div>
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

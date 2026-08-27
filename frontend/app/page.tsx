"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { MOODS, RED_FLAGS, MUSCLE_ZH } from "@/lib/constants";
import { Card, Field, PillButton, ChipGroup, inputCls, ErrorBanner } from "@/components/ui";

type Plan = any;

export default function Today() {
  const [profileId, setProfileId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  // check-in 表单
  const [mood, setMood] = useState<string[]>(["ok"]);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [soreness, setSoreness] = useState(0);
  const [pain, setPain] = useState("none");
  const [minutes, setMinutes] = useState(40);
  const [flags, setFlags] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<any>(null);

  // 反馈
  const [completion, setCompletion] = useState(1);
  const [rpe, setRpe] = useState("");
  const [painAfter, setPainAfter] = useState("none");
  const [moodAfter, setMoodAfter] = useState("ok");
  const [satisfaction, setSatisfaction] = useState(3);
  const [fbBusy, setFbBusy] = useState(false);
  const [fbDone, setFbDone] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("profile_id");
    if (id) setProfileId(+id);
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!profileId) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">欢迎使用 CycleFit</h1>
        <p className="text-sm text-moss">先建立你的档案，我会据此生成适合你的训练计划。</p>
        <Link href="/onboarding" className="inline-block rounded-full bg-meadow px-6 py-2.5 text-sm font-medium text-ink">
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
        sleep_hours: +sleep, soreness: +soreness, pain, mood: mood[0] || "ok",
        red_flags: flags,
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">今日</h1>
        <p className="mt-1 text-sm text-moss">30 秒告诉身体与心情，我来回答“今天怎么练”。</p>
      </div>

      <Card>
        <Field label="今天心情">
          <ChipGroup options={MOODS} value={mood} onChange={setMood} single />
        </Field>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="主观能量（1–5）">
            <input className={inputCls()} type="number" min={1} max={5} value={energy} onChange={(e) => setEnergy(+e.target.value)} />
          </Field>
          <Field label="睡眠（小时）">
            <input className={inputCls()} type="number" step={0.5} min={0} max={24} value={sleep} onChange={(e) => setSleep(+e.target.value)} />
          </Field>
          <Field label="训练酸痛（0–5）">
            <input className={inputCls()} type="number" min={0} max={5} value={soreness} onChange={(e) => setSoreness(+e.target.value)} />
          </Field>
          <Field label="疼痛 / 不适">
            <select className={inputCls()} value={pain} onChange={(e) => setPain(e.target.value)}>
              <option value="none">无</option><option value="mild">轻微</option><option value="moderate">中等</option>
            </select>
          </Field>
          <Field label="可用时间（分钟）">
            <input className={inputCls()} type="number" min={10} max={180} value={minutes} onChange={(e) => setMinutes(+e.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="红旗症状（如有，系统会停止并建议就医）">
            <ChipGroup options={RED_FLAGS} value={flags} onChange={setFlags} />
          </Field>
        </div>

        {err && <div className="mt-4"><ErrorBanner message={err} /></div>}
        <div className="mt-4">
          <PillButton onClick={submitCheckin} disabled={busy} className="w-full">
            {busy ? "生成中…" : "生成今日计划"}
          </PillButton>
        </div>
      </Card>

      {result?.status === "safety_stop" && (
        <Card tint="bg-danger/5">
          <h2 className="font-display text-xl font-bold text-danger">安全提示</h2>
          {result.red_flags.map((f: any) => (
            <p key={f.code} className="mt-2 text-sm text-danger">· {f.message}</p>
          ))}
        </Card>
      )}

      {result?.status === "ok" && (
        <>
          <Card tint="bg-keylime">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-bold text-ink">准备度</h2>
              <span className="text-xs text-moss">置信度 {result.confidence}</span>
            </div>
            <p className="mt-1 text-sm">
              <span className="font-medium">{result.readiness.label}</span>（{result.readiness.score} 分）· {result.readiness.adjust}
            </p>
          </Card>

          {result.comfort_msg && (
            <Card tint="bg-rose-soft border-rose/40">
              <h2 className="font-display text-xl font-bold text-rose">❤️ 想对你说</h2>
              <p className="mt-2 text-sm leading-relaxed">{result.comfort_msg}</p>
              <p className="mt-1 text-xs text-rose/80">{result.rest_suggestion}</p>
            </Card>
          )}

          <Card>
            <h2 className="font-display text-xl font-bold text-ink">为什么这样安排</h2>
            <p className="mt-2 text-sm leading-relaxed">{result.rationale_text}</p>
          </Card>

          {result.plan.blocks.map((b: any, i: number) => (
            <Card key={i}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-bold text-ink">
                  {b.title}
                  {b.duration_min ? <span className="ml-1 text-xs text-moss">约 {b.duration_min} 分钟</span> : null}
                </h3>
              </div>
              {b.items?.map((it: string, j: number) => (
                <p key={j} className="mt-2 text-sm text-charcoal">· {it}</p>
              ))}
              {b.exercises?.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-frost text-xs text-moss">
                        <th className="py-2 pr-3 font-normal">动作</th>
                        <th className="py-2 pr-2 font-normal">组</th>
                        <th className="py-2 pr-2 font-normal">次</th>
                        <th className="py-2 pr-2 font-normal">RPE</th>
                        <th className="py-2 font-normal">休息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.exercises.map((e: any, j: number) => (
                        <tr key={j} className="border-b border-frost/60 last:border-0">
                          <td className="py-2 pr-3">
                            <div className="font-medium">{e.name_zh}</div>
                            <div className="text-xs text-moss">{e.name_en}</div>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {e.primary_muscles?.map((m: string) => (
                                <span key={m} className="rounded-full bg-keylime px-2 py-0.5 text-[11px] text-ink">
                                  {MUSCLE_ZH[m] || m}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 pr-2">{e.sets}</td>
                          <td className="py-2 pr-2">{e.reps}</td>
                          <td className="py-2 pr-2">{e.rpe}</td>
                          <td className="py-2">{e.rest_sec}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}

          <Card>
            <h2 className="font-display text-xl font-bold text-ink">训练反馈</h2>
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
  );
}

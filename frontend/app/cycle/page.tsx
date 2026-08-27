"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, PillButton, Field, inputCls, HeroTitle, Tag, LeafIcon, ErrorBanner } from "@/components/ui";

const PHASE_COLOR: Record<string, string> = {
  menstrual: "rose", follicular: "keylime", ovulation: "sage", luteal: "rose",
};

export default function Cycle() {
  const [profileId, setProfileId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const load = (id: number) => api.cycle(id).then(setData).catch((e) => setErr(e.userMessage));

  useEffect(() => {
    const id = localStorage.getItem("profile_id");
    if (!id) return;
    setProfileId(+id);
    load(+id);
  }, []);

  if (!profileId) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-20 text-center">
        <LeafIcon className="mx-auto h-16 w-16" />
        <h1 className="font-display mt-4 text-3xl text-ink">周期</h1>
        <p className="mt-2 text-sm text-moss">先建立档案，才能记录与预测经期。</p>
        <Link href="/onboarding" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm font-medium text-cream">
          开始建档
        </Link>
      </div>
    );
  }

  const submit = async () => {
    if (!start) { setErr("请选择经期开始日期"); return; }
    setBusy(true);
    setErr("");
    try {
      await api.addPeriod({ profile_id: profileId, start_date: start, end_date: end || null });
      setStart(""); setEnd("");
      await load(profileId);
    } catch (e: any) {
      setErr(e.userMessage || "记录失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <section className="bg-keylime/70">
        <div className="mx-auto flex max-w-3xl items-end justify-between px-4 py-8">
          <div>
            <HeroTitle eyebrow="Cycle · 周期" lines={[{ text: "看懂自己的" }, { text: "节律", accent: true }]} />
            <p className="mt-2 text-sm text-ink/70">记录经期，预测下次经期与激素周期。</p>
          </div>
          <LeafIcon className="h-16 w-16 shrink-0 opacity-80" />
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-4 px-4">
        <Card>
          <h2 className="font-display text-lg text-ink">记录经期</h2>
          <p className="mt-1 text-xs text-moss">导入经期开始日，系统会据此预测下次经期与激素阶段。</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="经期开始日">
              <input className={inputCls()} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="结束日（可选）">
              <input className={inputCls()} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          {err && <div className="mt-3"><ErrorBanner message={err} /></div>}
          <div className="mt-4">
            <PillButton onClick={submit} disabled={busy} className="w-full">
              {busy ? "记录中…" : "记录这次经期"}
            </PillButton>
          </div>
        </Card>

        {data?.has_data && (
          <>
            <Card tint="bg-keylime">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg text-ink">当前周期</h2>
                <Tag tone={PHASE_COLOR[data.phase.key] || "keylime"}>{data.phase.name}</Tag>
              </div>
              <p className="mt-2 text-sm">
                今天是周期第 <span className="font-display text-xl text-ink">{data.cycle_day}</span> 天
                <span className="text-moss">（平均周期 {data.avg_cycle} 天 · 置信度 {data.confidence}）</span>
              </p>
              <p className="mt-2 text-sm text-ink/80">{data.phase.hormone}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="text-xs text-moss">上次经期</div>
                  <div className="font-medium">{data.last_period}</div>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="text-xs text-moss">预测下次</div>
                  <div className="font-medium text-meadow">{data.next_period}</div>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="font-display text-lg text-ink">四个阶段</h2>
              <div className="mt-3 space-y-3">
                {data.phases.map((p: any) => (
                  <div key={p.key} className="flex items-start gap-3">
                    <span className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                      p.key === "menstrual" || p.key === "luteal" ? "bg-rose" :
                      p.key === "ovulation" ? "bg-sage" : "bg-meadow"}`} />
                    <div>
                      <div className="text-sm font-medium text-ink">{p.name} <span className="text-xs text-moss">· {p.days}</span></div>
                      <p className="text-xs text-moss">{p.hormone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {data.recent?.length > 0 && (
              <Card>
                <h2 className="font-display text-lg text-ink">最近记录</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.recent.map((d: string) => (
                    <span key={d} className="rounded-full bg-cream px-3 py-1 text-xs text-charcoal">{d}</span>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {data && !data.has_data && (
          <Card>
            <p className="text-sm text-moss">还没有经期记录。记录 2–3 次经期后，就能看到周期预测与激素阶段。</p>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { GOALS, EXPERIENCE, EQUIPMENT, INJURED, CYCLE_MODES } from "@/lib/constants";
import { Card, Field, PillButton, ChipGroup, inputCls, ErrorBanner, HeroTitle, PatchBadge } from "@/components/ui";

export default function Onboarding() {
  const router = useRouter();
  const [goal, setGoal] = useState("health");
  const [experience, setExperience] = useState("beginner");
  const [freq, setFreq] = useState(3);
  const [minutes, setMinutes] = useState(40);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injured, setInjured] = useState<string[]>([]);
  const [cycle, setCycle] = useState("unknown");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api.onboarding({
        goal, experience_level: experience, weekly_frequency: +freq,
        session_minutes: +minutes, equipment, injured_areas: injured, cycle_mode: cycle,
      });
      localStorage.setItem("profile_id", String(r.profile_id));
      router.push("/");
    } catch (e: any) {
      setErr(e.userMessage || "提交失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <section className="bg-ink text-cream">
        <div className="mx-auto flex max-w-3xl items-start justify-between px-4 py-8">
          <div>
            <HeroTitle eyebrow="Onboarding · 建档" lines={[{ text: "先认识你" }, { text: "再谈训练", accent: true }]} />
            <p className="mt-2 text-sm text-cream/70">我了解你的目标与限制，才会给适合你的计划，而不是套模板。</p>
          </div>
          <PatchBadge emoji="🌱" rotate={6} />
        </div>
      </section>

      <div className="mx-auto -mt-4 max-w-3xl space-y-4 px-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="训练目标">
            <select className={inputCls()} value={goal} onChange={(e) => setGoal(e.target.value)}>
              {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="训练经验">
            <select className={inputCls()} value={experience} onChange={(e) => setExperience(e.target.value)}>
              {EXPERIENCE.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="每周训练次数">
            <input className={inputCls()} type="number" min={1} max={7} value={freq} onChange={(e) => setFreq(+e.target.value)} />
          </Field>
          <Field label="单次时长（分钟）">
            <input className={inputCls()} type="number" min={10} max={180} value={minutes} onChange={(e) => setMinutes(+e.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="可用器械（不选 = 居家徒手）">
            <ChipGroup options={EQUIPMENT} value={equipment} onChange={setEquipment} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="伤病 / 不适部位">
            <ChipGroup options={INJURED} value={injured} onChange={setInjured} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="周期 / 激素状态">
            <select className={inputCls()} value={cycle} onChange={(e) => setCycle(e.target.value)}>
              {CYCLE_MODES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {err && <ErrorBanner message={err} />}
      <PillButton onClick={submit} disabled={busy} className="w-full">
        {busy ? "提交中…" : "生成我的首周计划"}
      </PillButton>
      </div>
    </div>
  );
}

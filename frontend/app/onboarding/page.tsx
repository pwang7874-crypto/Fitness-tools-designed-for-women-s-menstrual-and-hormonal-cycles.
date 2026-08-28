"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CYCLE_MODES, EQUIPMENT, EXPERIENCE, GOALS, INJURED } from "@/lib/constants";
import { errorMessage } from "@/lib/utils";
import {
  Card, ChipGroup, ErrorBanner, Field, HeroTitle, inputCls, LeafIcon, PillButton, Switch,
} from "@/components/ui";

function ConsentRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-frost py-4 last:border-0">
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <p className="mt-1 max-w-xl text-xs leading-5 text-moss">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const inviteRequired = process.env.NEXT_PUBLIC_INVITE_REQUIRED === "true";
  const [step, setStep] = useState(1);
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const [moodConsent, setMoodConsent] = useState(false);
  const [cycleConsent, setCycleConsent] = useState(false);
  const [goal, setGoal] = useState("health");
  const [experience, setExperience] = useState("beginner");
  const [frequency, setFrequency] = useState(3);
  const [minutes, setMinutes] = useState(40);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injured, setInjured] = useState<string[]>([]);
  const [cycleMode, setCycleMode] = useState("unknown");
  const [typicalCycleDays, setTypicalCycleDays] = useState(28);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const next = () => {
    setError("");
    if (step === 1 && inviteRequired && !inviteCode.trim()) {
      setError("请输入首批体验邀请码。");
      return;
    }
    if (step === 1 && (!adult || !terms || !healthConsent)) {
      setError("请确认已满 18 周岁，并同意服务条款与健康数据处理说明。");
      return;
    }
    setStep((value) => Math.min(3, value + 1));
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api.onboarding({
        invite_code: inviteCode.trim(),
        display_name: displayName,
        is_adult: adult,
        accepted_terms: terms,
        health_consent: healthConsent,
        mood_consent: moodConsent,
        cycle_consent: cycleConsent,
        goal,
        experience_level: experience,
        weekly_frequency: frequency,
        session_minutes: minutes,
        equipment,
        injured_areas: injured,
        cycle_mode: cycleConsent ? cycleMode : "unknown",
        typical_cycle_days: typicalCycleDays,
      });
      localStorage.setItem("profile_id", String(result.profile_id));
      router.push("/");
      router.refresh();
    } catch (reason) {
      setError(errorMessage(reason, "建档失败，请稍后再试"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell grid gap-3 py-3 md:grid-cols-[.72fr_1.28fr] md:py-6">
      <aside className="surface-panel flex min-h-[230px] flex-col justify-between bg-slate md:min-h-[calc(100vh-124px)]">
        <HeroTitle eyebrow="Onboarding · 建档" lines={[{ text: "先认识你" }, { text: "再谈训练", accent: true }]} />
        <div>
          <LeafIcon className="mb-5 h-20 w-20 text-ink" />
          <p className="max-w-sm text-sm leading-6 text-charcoal/80">
            顺期健身app提供训练建议，不做诊断、治疗、排卵确认或避孕判断。任何明显或持续不适都应优先咨询专业人员。
          </p>
        </div>
      </aside>

      <section className="surface-panel bg-keylime">
        <div className="mb-8 flex items-center gap-2" aria-label={`建档进度，第 ${step} 步，共 3 步`}>
          {[1, 2, 3].map((item) => (
            <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-ink" : "bg-cream/80"}`} />
          ))}
          <span className="ml-2 text-xs text-moss">{step}/3</span>
        </div>

        {step === 1 && (
          <div className="animate-rise">
            <h2 className="font-display text-4xl text-ink">适用性与基础授权</h2>
            <p className="mt-2 text-sm leading-6 text-moss">必要授权与可选敏感授权分开，不捆绑。</p>
            <Card tint="mt-7 bg-cream">
              {inviteRequired && (
                <div className="mb-5">
                  <Field label="首批体验邀请码" hint="用于控制测试范围；请向邀请人获取。">
                    <input className={inputCls()} value={inviteCode} maxLength={64}
                      autoComplete="one-time-code" placeholder="输入邀请码"
                      onChange={(event) => setInviteCode(event.target.value)} />
                  </Field>
                </div>
              )}
              <Field label="怎么称呼你？" hint="可不填；不会用于公开展示。">
                <input className={inputCls()} value={displayName} maxLength={32}
                  placeholder="例如：小林" onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
              <div className="mt-5">
                <ConsentRow title="我已满 18 周岁" description="当前版本仅面向成年人。"
                  checked={adult} onChange={setAdult} />
                <ConsentRow title="同意服务条款" description="理解产品边界、安全提示与使用规则。"
                  checked={terms} onChange={setTerms} />
                <ConsentRow title="同意处理训练与健康状态数据" description="用于生成今日训练、执行反馈与趋势；这是使用核心功能所必需的授权。"
                  checked={healthConsent} onChange={setHealthConsent} />
              </div>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="animate-rise">
            <h2 className="font-display text-4xl text-ink">你的训练底图</h2>
            <p className="mt-2 text-sm leading-6 text-moss">计划只从审核动作库中选择，并严格匹配经验、器械与伤病限制。</p>
            <Card tint="mt-7 bg-cream">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="训练目标">
                  <select className={inputCls()} value={goal} onChange={(event) => setGoal(event.target.value)}>
                    {GOALS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
                <Field label="训练经验">
                  <select className={inputCls()} value={experience} onChange={(event) => setExperience(event.target.value)}>
                    {EXPERIENCE.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
                <Field label="每周计划次数">
                  <input className={inputCls()} type="number" min={1} max={7} value={frequency}
                    onChange={(event) => setFrequency(Number(event.target.value))} />
                </Field>
                <Field label="单次常用时长">
                  <input className={inputCls()} type="number" min={10} max={180} value={minutes}
                    onChange={(event) => setMinutes(Number(event.target.value))} />
                </Field>
              </div>
              <div className="mt-6">
                <Field label="常用器械" hint="不选表示以徒手与瑜伽垫动作优先。">
                  <ChipGroup options={EQUIPMENT} value={equipment} onChange={setEquipment} />
                </Field>
              </div>
              <div className="mt-6">
                <Field label="需要避开的部位">
                  <ChipGroup options={INJURED} value={injured} onChange={setInjured} />
                </Field>
              </div>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="animate-rise">
            <h2 className="font-display text-4xl text-ink">由你决定的敏感数据</h2>
            <p className="mt-2 text-sm leading-6 text-moss">这两项均可跳过，并可在“我的”中随时撤回。</p>
            <Card tint="mt-7 bg-cream">
              <ConsentRow
                title="保存情绪与私密日记"
                description="情绪只由你手动选择；日记原文只保存，不发送给 AI，也不自动分析。"
                checked={moodConsent}
                onChange={setMoodConsent}
              />
              <ConsentRow
                title="保存周期与出血记录"
                description="用于日历背景。结果不是医学判断、排卵确认或避孕依据。"
                checked={cycleConsent}
                onChange={setCycleConsent}
              />
              {cycleConsent && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="周期 / 激素状态">
                    <select className={inputCls()} value={cycleMode} onChange={(event) => setCycleMode(event.target.value)}>
                      {CYCLE_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </Field>
                  <Field label="你印象中的周期长度" hint="不确定可保留 28 天。">
                    <div className="relative">
                      <input className={inputCls()} type="number" min={21} max={45}
                        value={typicalCycleDays}
                        onChange={(event) => setTypicalCycleDays(Number(event.target.value))} />
                      <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs text-moss">天</span>
                    </div>
                  </Field>
                  <div className="sm:col-span-2 rounded-[12px] bg-sage/60 p-4 text-xs leading-5 text-moss">
                    导入第 1 次经期后会立即按这个天数给出初步宽区间；以后有真实周期间隔时会自动替换。
                  </div>
                  <p className="mt-2 text-xs leading-5 text-moss">
                    激素使用者只显示出血记录，不推断自然周期阶段；不规律周期仅显示宽泛区间。
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {error && <div className="mt-5"><ErrorBanner message={error} /></div>}
        <div className="mt-7 flex items-center justify-between gap-3">
          {step > 1 ? (
            <PillButton variant="ghost" onClick={() => { setError(""); setStep(step - 1); }}>上一步</PillButton>
          ) : <span />}
          {step < 3 ? (
            <PillButton onClick={next}>继续 <span aria-hidden>→</span></PillButton>
          ) : (
            <PillButton onClick={submit} disabled={busy}>{busy ? "正在建立…" : "完成建档"}</PillButton>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ExportData } from "@/lib/api";
import { CYCLE_MODES, EQUIPMENT, EXPERIENCE, GOALS, INJURED } from "@/lib/constants";
import { errorMessage } from "@/lib/utils";
import { useProfile } from "@/lib/useProfile";
import {
  Card, ChipGroup, EmptyState, ErrorBanner, Field, inputCls, LinkButton, LoadingState,
  PageHero, PillButton, SectionHeading, Switch, Tag,
} from "@/components/ui";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, loading, refresh } = useProfile();
  const [data, setData] = useState<ExportData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState("health");
  const [experience, setExperience] = useState("beginner");
  const [frequency, setFrequency] = useState(3);
  const [minutes, setMinutes] = useState(40);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injured, setInjured] = useState<string[]>([]);
  const [cycleMode, setCycleMode] = useState("unknown");
  const [typicalCycleDays, setTypicalCycleDays] = useState(28);
  const [cycleConsent, setCycleConsent] = useState(false);
  const [moodConsent, setMoodConsent] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setGoal(profile.goal);
    setExperience(profile.experience_level);
    setFrequency(profile.weekly_frequency);
    setMinutes(profile.session_minutes);
    setEquipment(profile.equipment);
    setInjured(profile.injured_areas);
    setCycleMode(profile.cycle_mode);
    setTypicalCycleDays(profile.typical_cycle_days);
    setCycleConsent(profile.cycle_consent);
    setMoodConsent(profile.mood_consent);
    api.export(profile.profile_id)
      .then(setData)
      .catch((reason) => setError(errorMessage(reason, "无法读取数据清单")));
  }, [profile]);

  if (loading) return <LoadingState label="正在读取档案与数据清单" />;
  if (!profile) {
    return <EmptyState title="尚未建立档案" description="先完成建档，再管理训练偏好、授权与个人数据。"
      action={<LinkButton href="/onboarding">开始建档</LinkButton>} />;
  }

  const saveProfile = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.updateProfile(profile.profile_id, {
        display_name: displayName,
        goal,
        experience_level: experience,
        weekly_frequency: frequency,
        session_minutes: minutes,
        equipment,
        injured_areas: injured,
        cycle_mode: cycleConsent ? cycleMode : "unknown",
        typical_cycle_days: typicalCycleDays,
      });
      await refresh();
      setMessage("训练档案已更新。");
    } catch (reason) {
      setError(errorMessage(reason, "档案保存失败"));
    } finally {
      setBusy(false);
    }
  };

  const saveConsents = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api.updateConsents(profile.profile_id, {
        cycle_consent: cycleConsent,
        mood_consent: moodConsent,
      });
      await refresh();
      setMessage(response.message);
    } catch (reason) {
      setError(errorMessage(reason, "授权设置保存失败"));
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shunqi-fitness-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deleteAll = async () => {
    if (deleteText !== "删除") return;
    setBusy(true);
    setError("");
    try {
      await api.deleteProfile(profile.profile_id);
      localStorage.removeItem("profile_id");
      router.push("/onboarding");
      router.refresh();
    } catch (reason) {
      setError(errorMessage(reason, "删除失败"));
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Profile · 我的"
        title="你的数据"
        accent="由你掌控"
        description="修改训练偏好、撤回可选授权、导出完整记录，或彻底删除档案与全部关联数据。"
        aside={
          <div className="hero-inset w-full rounded-[20px] bg-cream p-5">
            <div className="eyebrow">Private session</div>
            <div className="font-display mt-3 text-3xl text-ink">This device only</div>
            <p className="mt-5 text-xs leading-5 text-moss">当前 MVP 使用 30 天 HttpOnly 设备会话隔离档案，不把访问密钥交给前端脚本。</p>
          </div>
        }
      />

      <div className="page-shell space-y-3 pb-14">
        {error && <ErrorBanner message={error} />}
        {message && <div className="rounded-[14px] bg-sage px-4 py-3 text-sm text-ink">{message}</div>}

        <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
          <Card tint="bg-keylime">
            <SectionHeading eyebrow="Training profile" title="训练偏好与限制" description="修改后会影响下一份计划；已生成计划不会被偷偷改写。" />
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field label="称呼">
                <input className={inputCls()} maxLength={32} value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
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
              <Field label="常用单次时长">
                <input className={inputCls()} type="number" min={10} max={180} value={minutes}
                  onChange={(event) => setMinutes(Number(event.target.value))} />
              </Field>
              <Field label="周期 / 激素状态">
                <select className={inputCls()} disabled={!cycleConsent} value={cycleMode}
                  onChange={(event) => setCycleMode(event.target.value)}>
                  {CYCLE_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label="印象中的周期长度" hint="只用于第 1 条记录后的初步估算。">
                <div className="relative">
                  <input className={inputCls()} disabled={!cycleConsent} type="number" min={21} max={45}
                    value={typicalCycleDays} onChange={(event) => setTypicalCycleDays(Number(event.target.value))} />
                  <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs text-moss">天</span>
                </div>
              </Field>
            </div>
            <div className="mt-6">
              <Field label="常用器械">
                <ChipGroup options={EQUIPMENT} value={equipment} onChange={setEquipment} />
              </Field>
            </div>
            <div className="mt-6">
              <Field label="需要避开的部位">
                <ChipGroup options={INJURED} value={injured} onChange={setInjured} />
              </Field>
            </div>
            <PillButton className="mt-7" onClick={saveProfile} disabled={busy}>{busy ? "保存中…" : "保存训练档案"}</PillButton>
          </Card>

          <Card tint="bg-slate">
            <SectionHeading eyebrow="Consents" title="可选敏感数据授权" description="撤回后立即停止对应处理；历史内容会保留到你单独删除或删除全部数据。" />
            <div className="mt-7 divide-y divide-ink/10">
              <div className="flex items-start justify-between gap-4 py-4">
                <div>
                  <div className="text-sm font-medium text-ink">情绪与私密日记</div>
                  <p className="mt-1 text-xs leading-5 text-moss">日记不发送给 AI；情绪由你手动选择。</p>
                </div>
                <Switch checked={moodConsent} onChange={setMoodConsent} label="情绪与私密日记授权" />
              </div>
              <div className="flex items-start justify-between gap-4 py-4">
                <div>
                  <div className="text-sm font-medium text-ink">周期与出血记录</div>
                  <p className="mt-1 text-xs leading-5 text-moss">仅日历估算；不是医学或避孕依据。</p>
                </div>
                <Switch checked={cycleConsent} onChange={setCycleConsent} label="周期与出血授权" />
              </div>
            </div>
            <PillButton variant="ghost" className="mt-6 w-full" onClick={saveConsents} disabled={busy}>
              保存授权设置
            </PillButton>
          </Card>
        </div>

        <Card tint="bg-sage">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionHeading eyebrow="Data inventory" title="完整数据清单" description="导出包含档案、打卡原文、计划、逐组训练、情绪、周期与安全事件。" />
            <Tag tone="cream">Schema {data?.schema_version || "0.3"}</Tag>
          </div>
          {data ? (
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["打卡", data.checkins.length],
                ["计划", data.plans.length],
                ["训练", data.sessions.length],
                ["情绪", data.moods.length],
                ["周期", data.periods.length],
                ["安全事件", data.safety_events.length],
              ].map(([label, count]) => (
                <div key={String(label)} className="rounded-[14px] bg-cream p-4 text-center">
                  <div className="font-display text-3xl text-ink">{count}</div>
                  <div className="mt-1 text-xs text-moss">{label}</div>
                </div>
              ))}
            </div>
          ) : <p className="mt-6 text-sm text-moss">正在读取数据清单…</p>}
          <PillButton variant="ghost" className="mt-6" onClick={download} disabled={!data}>下载完整 JSON</PillButton>
        </Card>

        <Card tint="bg-danger/8">
          <SectionHeading eyebrow="Danger zone" title="删除全部数据" description="这会删除档案及所有打卡、计划、训练、日记、周期和安全事件，并让当前会话失效。无法恢复。" />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input className={inputCls()} value={deleteText} placeholder="输入“删除”确认"
              onChange={(event) => setDeleteText(event.target.value)} />
            <PillButton variant="danger" disabled={deleteText !== "删除" || busy} onClick={deleteAll}>
              永久删除
            </PillButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

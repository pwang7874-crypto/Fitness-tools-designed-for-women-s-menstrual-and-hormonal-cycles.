"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type CycleData } from "@/lib/api";
import { errorMessage, formatDate } from "@/lib/utils";
import { useProfile } from "@/lib/useProfile";
import {
  Card, EmptyState, ErrorBanner, Field, inputCls, LoadingState, PageHero,
  LinkButton, PillButton, SectionHeading, Tag,
} from "@/components/ui";

function Calendar({ periodStarts }: { periodStarts: string[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + days }, (_, index) => index < firstDay ? null : index - firstDay + 1);
  const starts = new Set(periodStarts.filter((value) => {
    const date = new Date(`${value}T00:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  }).map((value) => Number(value.slice(-2))));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-3xl text-ink">{year} 年 {month + 1} 月</h3>
        <Tag tone="cream">开始日以圆点标记</Tag>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-wider text-moss">
        {"日一二三四五六".split("").map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => (
          <div key={`${day}-${index}`} className={`relative flex aspect-square items-center justify-center rounded-[10px] text-sm ${day === now.getDate()
            ? "bg-ink text-cream"
            : day ? "bg-cream text-charcoal" : ""}`}>
            {day}
            {day && starts.has(day) && (
              <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${day === now.getDate() ? "bg-sage" : "bg-ink"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CyclePage() {
  const { profile, loading } = useProfile();
  const [data, setData] = useState<CycleData | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (profileId: number) => {
    try {
      setData(await api.cycle(profileId));
    } catch (reason) {
      setError(errorMessage(reason, "无法读取周期记录"));
    }
  }, []);

  useEffect(() => {
    if (profile) void load(profile.profile_id);
  }, [profile, load]);

  const periodStarts = useMemo(() => data?.records.map((record) => record.start_date) || [], [data]);

  if (loading) return <LoadingState label="正在读取周期授权与记录" />;
  if (!profile) {
    return <EmptyState title="尚未建立档案" description="建立档案后才可以选择是否启用周期记录。"
      action={<LinkButton href="/onboarding">开始建档</LinkButton>} />;
  }
  if (!profile.cycle_consent) {
    return (
      <>
        <PageHero eyebrow="Cycle · 周期" title="这部分数据" accent="由你决定" description="你没有开启周期数据授权，因此系统不会记录、推算或把周期用于训练背景。" />
        <EmptyState title="周期功能未启用" description="如需开启，请前往“我的”调整可选敏感数据授权。"
          action={<LinkButton href="/profile">管理授权</LinkButton>} />
      </>
    );
  }

  const submit = async () => {
    if (!start) {
      setError("请选择经期开始日");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.addPeriod({
        profile_id: profile.profile_id,
        start_date: start,
        end_date: end || null,
      });
      setStart("");
      setEnd("");
      await load(profile.profile_id);
    } catch (reason) {
      setError(errorMessage(reason, "记录失败"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number | null) => {
    if (!id || !window.confirm("删除这条经期记录？删除后预测会重新计算。")) return;
    try {
      await api.deletePeriod(profile.profile_id, id);
      await load(profile.profile_id);
    } catch (reason) {
      setError(errorMessage(reason, "删除失败"));
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Cycle · 周期"
        title="记录节律"
        accent="不定义自己"
        description="周期信息只作日历背景。疼痛、睡眠、恢复和你当天的主观感受永远优先。"
        aside={
          <div className="hero-inset w-full rounded-[20px] bg-cream p-5">
            <div className="eyebrow">Mode</div>
            <div className="font-display mt-3 text-3xl text-ink">
              {profile.cycle_mode === "natural" ? "自然周期" :
                profile.cycle_mode === "hormonal" ? "激素使用" :
                  profile.cycle_mode === "irregular" ? "不规律周期" : "仅估算日期"}
            </div>
            <p className="mt-5 text-xs leading-5 text-moss">{data?.message || "正在读取…"}</p>
          </div>
        }
      />

      <div className="page-shell stagger grid gap-3 pb-14 lg:grid-cols-[.78fr_1.22fr]">
        <div className="space-y-3">
          <Card tint="bg-sage">
            <SectionHeading eyebrow="Record" title="新增一次记录" description="若开始日相同，会更新已有记录而不是重复创建。" />
            <div className="mt-6 grid gap-4">
              <Field label="经期开始日">
                <input className={inputCls()} type="date" max={new Date().toISOString().slice(0, 10)}
                  value={start} onChange={(event) => setStart(event.target.value)} />
              </Field>
              <Field label="结束日（可选）">
                <input className={inputCls()} type="date" min={start || undefined}
                  value={end} onChange={(event) => setEnd(event.target.value)} />
              </Field>
              {error && <ErrorBanner message={error} />}
              <PillButton onClick={submit} disabled={busy}>{busy ? "正在保存…" : "保存记录"}</PillButton>
            </div>
          </Card>

          <Card tint="bg-cream-2">
            <SectionHeading eyebrow="History" title="最近记录" />
            <div className="mt-5 divide-y divide-frost">
              {data?.records.length ? data.records.map((record) => (
                <div key={record.id || record.start_date} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-ink">{formatDate(record.start_date)}</div>
                    <div className="mt-1 text-xs text-moss">{record.end_date ? `至 ${formatDate(record.end_date)}` : "未记录结束日"}</div>
                  </div>
                  {record.id && (
                    <button type="button" className="interactive rounded-[7px] px-3 py-2 text-xs text-danger hover:bg-danger/8"
                      onClick={() => void remove(record.id)}>删除</button>
                  )}
                </div>
              )) : <p className="text-sm text-moss">还没有记录。</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card tint="bg-keylime">
            <Calendar periodStarts={periodStarts} />
          </Card>

          {data && (
            <Card tint="bg-slate">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeading eyebrow="Estimate" title={
                  data.status === "ready" && data.phase ? data.phase.name :
                    data.status === "tracking_only" ? "仅记录出血" :
                      data.status === "baseline_estimate" ? "已有初步估算" :
                        data.status === "personal_estimate" ? "已用真实间隔校准" :
                      data.status === "low_confidence" ? "低置信度区间" :
                        "继续积累记录"
                } />
                <Tag tone="cream">{data.sample_size} 个完整间隔</Tag>
              </div>

              {data.next_period_window && (
                <div className="mt-6 rounded-[16px] bg-cream p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs uppercase tracking-[.16em] text-moss">下次开始日估算区间</div>
                    <Tag tone="sage">{data.confidence_label}</Tag>
                  </div>
                  <div className="font-display mt-3 text-3xl text-ink sm:text-4xl">
                    {formatDate(data.next_period_window.start)} — {formatDate(data.next_period_window.end)}
                  </div>
                  <div className="mt-5 grid gap-2 border-t border-frost pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <div className="text-[11px] text-moss">本次估算依据</div>
                      <p className="mt-1 text-sm leading-6 text-charcoal/80">{data.prediction_basis}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-moss">置信度</div>
                      <div className="font-display mt-1 text-2xl text-ink">{Math.round(data.confidence * 100)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {data.status === "ready" && data.phase && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[14px] bg-cream p-4">
                    <div className="text-xs text-moss">估算周期日</div>
                    <div className="font-display mt-1 text-4xl text-ink">第 {data.cycle_day} 天</div>
                  </div>
                  <div className="rounded-[14px] bg-cream p-4">
                    <div className="text-xs text-moss">近期典型周期</div>
                    <div className="font-display mt-1 text-3xl text-ink">{data.avg_cycle} 天</div>
                  </div>
                  <p className="sm:col-span-2 text-sm leading-6 text-charcoal/80">{data.phase.hormone}</p>
                </div>
              )}

              {data.has_data && data.status !== "tracking_only" && (
                <div className="mt-6 rounded-[16px] border border-ink/10 bg-sage/55 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[.14em] text-moss">21-day observation</div>
                      <div className="mt-1 text-sm font-medium text-ink">
                        {data.observation.complete ? "观察检查已完成" : `观察第 ${data.observation.days_elapsed} / ${data.observation.target_days} 天`}
                      </div>
                    </div>
                    <Tag tone={data.observation.complete ? "ink" : "cream"}>
                      {data.observation.logged_days} 天有打卡
                    </Tag>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream">
                    <div className="h-full rounded-full bg-ink transition-[width] duration-700 ease-out"
                      style={{ width: `${data.observation.percent}%` }} />
                  </div>
                  <p className="mt-4 text-xs leading-5 text-moss">{data.observation.message}</p>
                </div>
              )}

              {data.status !== "tracking_only" && data.status !== "disabled" && (
                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                  {[
                    ["baseline", "第 1 次导入", "典型周期±宽区间"],
                    ["personal", "第 1 个间隔", "真实数据初次校准"],
                    ["history", "2+ 个间隔", "近期中位数个体化"],
                  ].map(([tier, title, description], index) => {
                    const rank = { none: -1, baseline: 0, personal: 1, history: 2 }[data.prediction_tier];
                    const reached = index <= rank;
                    const current = index === rank;
                    return (
                      <div key={tier} className={`rounded-[14px] p-4 transition-colors ${current ? "bg-ink text-cream" : reached ? "bg-sage text-ink" : "bg-cream/70 text-moss"}`}>
                        <div className="text-[10px] uppercase tracking-[.14em]">0{index + 1}</div>
                        <div className="mt-2 text-sm font-medium">{title}</div>
                        <div className={`mt-1 text-[11px] leading-4 ${current ? "text-cream/70" : "text-moss"}`}>{description}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-6 text-sm leading-6 text-charcoal/80">{data.message}</p>
              {data.has_data && data.status !== "tracking_only" && (
                <p className="mt-3 rounded-[12px] bg-cream/70 px-4 py-3 text-xs leading-5 text-moss">
                  说明：21 天是一次数据完整性检查，不是要等 21 天才开始估算。情绪、睡眠和身体感受只用于当日训练，不用来确认排卵或猜测周期长度。
                </p>
              )}
              <p className="mt-3 border-t border-ink/10 pt-3 text-xs leading-5 text-moss">{data.disclaimer}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

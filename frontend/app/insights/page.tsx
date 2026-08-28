"use client";

import { useEffect, useState } from "react";
import { api, type Insights, type Mood } from "@/lib/api";
import { MOOD_ICON } from "@/lib/constants";
import StatusIcon from "@/components/StatusIcon";
import { errorMessage } from "@/lib/utils";
import { useProfile } from "@/lib/useProfile";
import {
  Card, EmptyState, ErrorBanner, LinkButton, LoadingState, PageHero, SectionHeading, Tag,
} from "@/components/ui";

const moodLabels: Record<Mood, string> = {
  very_bad: "很糟",
  low: "有点低",
  ok: "平静",
  good: "不错",
  great: "很好",
};

export default function InsightsPage() {
  const { profile, loading: profileLoading } = useProfile();
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    api.insights(profile.profile_id)
      .then(setData)
      .catch((reason) => setError(errorMessage(reason, "无法读取洞察")));
  }, [profile]);

  if (profileLoading) return <LoadingState label="正在汇总近 28 天记录" />;
  if (!profile) {
    return <EmptyState title="尚未建立档案" description="有了训练反馈后，这里会显示保守、可解释的事实摘要。"
      action={<LinkButton href="/onboarding">开始建档</LinkButton>} />;
  }

  const moodTotal = data?.mood_summary.available
    ? Object.values(data.mood_summary.distribution).reduce((sum, value) => sum + (value || 0), 0)
    : 0;

  return (
    <div>
      <PageHero
        eyebrow="Insights · 洞察"
        title="看见记录"
        accent="不替你下结论"
        description="只呈现近 28 天的频次、平均值与共现，不把周期、情绪和训练之间的关系说成因果。"
        aside={
          <div className="hero-inset w-full rounded-[20px] bg-cream p-5">
            <div className="eyebrow">Window</div>
            <div className="font-display mt-3 text-5xl text-ink">28</div>
            <div className="mt-1 text-sm text-moss">天滚动窗口</div>
            <p className="mt-5 text-xs leading-5 text-moss">样本不足时明确不展示趋势，而不是补齐一条看似聪明的结论。</p>
          </div>
        }
      />

      <div className="page-shell space-y-3 pb-14">
        {error && <ErrorBanner message={error} />}
        {!data && !error && <LoadingState label="正在计算事实摘要" />}
        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "近 7 天训练", value: String(data.week_session_count), suffix: "次" },
                { label: "近 28 天训练", value: String(data.session_count), suffix: "次" },
                { label: "平均完成度", value: data.avg_completion == null ? "—" : String(Math.round(data.avg_completion * 100)), suffix: data.avg_completion == null ? "" : "%" },
                { label: "平均 RPE", value: data.avg_rpe == null ? "—" : String(data.avg_rpe), suffix: "" },
              ].map((item, index) => (
                <Card key={item.label} tint={index === 0 ? "bg-sage" : index === 1 ? "bg-keylime" : index === 2 ? "bg-slate" : "bg-cream-2"}>
                  <div className="text-xs text-moss">{item.label}</div>
                  <div className="font-display mt-4 text-5xl text-ink">{item.value}<span className="ml-1 text-xl">{item.suffix}</span></div>
                </Card>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[.82fr_1.18fr]">
              <Card tint="bg-keylime">
                <SectionHeading eyebrow="Observations" title="这段时间发生了什么" />
                <div className="mt-6 space-y-3">
                  {data.observations.map((observation) => (
                    <div key={observation} className="rounded-[14px] bg-cream p-4 text-sm leading-6 text-charcoal">
                      {observation}
                    </div>
                  ))}
                  <div className="rounded-[14px] bg-cream p-4">
                    <div className="text-xs text-moss">训练后疼痛 / 不适记录</div>
                    <div className="font-display mt-2 text-4xl text-ink">{data.pain_event_count} 次</div>
                  </div>
                </div>
              </Card>

              <Card tint="bg-slate">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <SectionHeading eyebrow="Mood sample" title="手动情绪分布" />
                  <Tag tone="cream">{data.mood_summary.sample_size}/{data.mood_summary.minimum_sample} 条</Tag>
                </div>
                {data.mood_summary.available ? (
                  <div className="mt-7 space-y-4">
                    {(Object.keys(moodLabels) as Mood[]).map((key) => {
                      const count = data.mood_summary.distribution[key] || 0;
                      const percentage = moodTotal ? Math.round(count / moodTotal * 100) : 0;
                      return (
                        <div key={key}>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-ink"><StatusIcon name={MOOD_ICON[key]} className="!h-6 !w-6" /> {moodLabels[key]}</span>
                            <span className="text-moss">{count} 条 · {percentage}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-cream">
                            <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-7 rounded-[14px] bg-cream p-5">
                    <div className="flex items-end gap-2" aria-hidden>
                      {Array.from({ length: data.mood_summary.minimum_sample }, (_, index) => (
                        <span key={index} className={`h-10 flex-1 rounded-[5px] ${index < data.mood_summary.sample_size ? "bg-ink" : "bg-frost"}`} />
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-moss">{data.mood_summary.message}</p>
                  </div>
                )}
                {data.mood_trend.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {data.mood_trend.map((item, index) => (
                      <Tag key={`${item.at}-${index}`} tone="cream"><StatusIcon name={MOOD_ICON[item.mood]} className="!h-5 !w-5" /> {item.tag || moodLabels[item.mood]}</Tag>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card tint="bg-cream-2">
              <p className="text-xs leading-5 text-moss">{data.disclaimer}</p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

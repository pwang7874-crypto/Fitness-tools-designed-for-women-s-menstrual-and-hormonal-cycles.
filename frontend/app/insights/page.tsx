"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { MOOD_EMOJI } from "@/lib/constants";
import { Card, Tag, HeroTitle, PatchBadge } from "@/components/ui";

export default function Insights() {
  const [profileId, setProfileId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("profile_id");
    if (!id) return;
    setProfileId(+id);
    api.insights(+id).then(setData).catch((e) => setErr(e.userMessage));
  }, []);

  if (!profileId) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl font-bold text-ink">洞察</h1>
        <p className="mt-2 text-sm text-moss">先建立档案，才能看到属于你的趋势。</p>
        <Link href="/onboarding" className="mt-6 inline-block rounded-full bg-meadow px-8 py-3 text-sm font-medium text-ink">
          开始建档
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-ink text-cream">
        <div className="mx-auto flex max-w-3xl items-start justify-between px-4 py-8">
          <div>
            <HeroTitle eyebrow="Insights · 洞察" lines={[{ text: "看见自己的" }, { text: "节奏", accent: true }]} />
            <p className="mt-2 text-sm text-cream/70">只陈述事实，不替你下结论。</p>
          </div>
          <PatchBadge emoji="🌙" rotate={-5} />
        </div>
      </section>

      <div className="mx-auto -mt-4 max-w-3xl space-y-4 px-4">
        {err && <Card><p className="text-sm text-danger">{err}</p></Card>}
        {!data && !err && <Card><p className="text-sm text-moss">加载中…</p></Card>}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center">
                <div className="font-display text-4xl font-bold text-ink">{data.session_count}</div>
                <div className="mt-1 text-xs text-moss">训练次数</div>
              </Card>
              <Card className="text-center">
                <div className="font-display text-4xl font-bold text-ink">
                  {data.avg_completion == null ? "—" : `${Math.round(data.avg_completion * 100)}%`}
                </div>
                <div className="mt-1 text-xs text-moss">平均完成度</div>
              </Card>
              <Card className="text-center">
                <div className="font-display text-4xl font-bold text-ink">{data.avg_rpe ?? "—"}</div>
                <div className="mt-1 text-xs text-moss">平均 RPE</div>
              </Card>
            </div>

            <Card>
              <h2 className="font-display text-lg font-bold text-ink">近期心情（AI 从日记识别）</h2>
              {data.mood_trend?.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.mood_trend.slice(0, 14).map((m: any, i: number) => (
                    <Tag key={i} tone="rose">
                      {MOOD_EMOJI[m.mood] || "😐"} {m.tag || m.mood}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-moss">还没有日记记录。写得越多，趋势越清晰。</p>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { MOODS } from "@/lib/constants";
import { Card } from "@/components/ui";

const moodOf = (v: string) => MOODS.find((m) => m.value === v);

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
      <div className="space-y-4 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">洞察</h1>
        <p className="text-sm text-moss">先建立档案，才能看到属于你的趋势。</p>
        <Link href="/onboarding" className="inline-block rounded-full bg-meadow px-6 py-2.5 text-sm font-medium text-ink">
          开始建档
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">洞察</h1>
        <p className="mt-1 text-sm text-moss">只陈述事实，不替你下结论。</p>
      </div>

      {err && <Card><p className="text-sm text-danger">{err}</p></Card>}
      {!data && !err && <Card><p className="text-sm text-moss">加载中…</p></Card>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <div className="font-display text-3xl font-bold text-ink">{data.session_count}</div>
              <div className="mt-1 text-xs text-moss">训练次数</div>
            </Card>
            <Card className="text-center">
              <div className="font-display text-3xl font-bold text-ink">
                {data.avg_completion == null ? "—" : `${Math.round(data.avg_completion * 100)}%`}
              </div>
              <div className="mt-1 text-xs text-moss">平均完成度</div>
            </Card>
            <Card className="text-center">
              <div className="font-display text-3xl font-bold text-ink">{data.avg_rpe ?? "—"}</div>
              <div className="mt-1 text-xs text-moss">平均 RPE</div>
            </Card>
          </div>

          <Card>
            <h2 className="font-display text-lg font-bold text-ink">近期心情</h2>
            {data.mood_trend?.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.mood_trend.slice(0, 14).map((m: any, i: number) => {
                  const mo = moodOf(m.mood);
                  return (
                    <span key={i} className="rounded-full border border-frost bg-white px-3 py-1.5 text-sm">
                      {mo ? `${mo.emoji} ${mo.label}` : m.mood}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-moss">还没有心情记录。记录得越多，趋势越清晰。</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

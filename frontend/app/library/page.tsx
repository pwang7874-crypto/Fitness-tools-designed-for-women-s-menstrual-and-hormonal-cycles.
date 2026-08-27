"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MUSCLE_ZH } from "@/lib/constants";
import { videoUrl } from "@/lib/utils";
import { Card, Tag, HeroTitle, LeafIcon } from "@/components/ui";

const CAT_ZH: Record<string, string> = {
  legs: "腿部", chest: "胸部", back: "背部", shoulders: "肩部", arms: "手臂", abs: "核心", calves: "小腿",
};

export default function Library() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.exercises().then(setExercises).catch((e) => setErr(e.userMessage));
  }, []);

  return (
    <div>
      <section className="bg-keylime/70">
        <div className="mx-auto flex max-w-3xl items-end justify-between px-4 py-8">
          <div>
            <HeroTitle eyebrow="Library · 动作库" lines={[{ text: "每个动作" }, { text: "都有教学", accent: true }]} />
            <p className="mt-2 text-sm text-ink/70">21 个审核动作，含发力肌群与教学视频。</p>
          </div>
          <LeafIcon className="h-16 w-16 shrink-0 opacity-80" />
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-3 px-4">
        {err && <Card><p className="text-sm text-danger">{err}</p></Card>}
        {!exercises.length && !err && <Card><p className="text-sm text-moss">加载中…</p></Card>}
        {exercises.map((e) => (
          <Card key={e.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{e.name_zh}</span>
                <Tag tone="sage">{CAT_ZH[e.category] || e.category}</Tag>
                {e.home_friendly && <Tag tone="keylime">居家可练</Tag>}
              </div>
              <div className="mt-0.5 text-xs text-moss">{e.name_en} · {e.level === "beginner" ? "入门" : e.level === "intermediate" ? "中级" : "进阶"}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {e.primary_muscles?.map((m: string) => (
                  <span key={m} className="rounded-full bg-keylime px-2 py-0.5 text-[11px] text-ink">{MUSCLE_ZH[m] || m}</span>
                ))}
              </div>
            </div>
            <a
              href={videoUrl(e.name_zh)}
              target="_blank"
              rel="noreferrer"
              className="ghost-link shrink-0 text-sm font-medium text-rose"
            >
              ▶ 教学
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}

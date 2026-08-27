"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { MOOD_EMOJI } from "@/lib/constants";
import { Card, Tag, HeroTitle, LeafIcon } from "@/components/ui";

export default function Diary() {
  const [profileId, setProfileId] = useState<number | null>(null);
  const [diaries, setDiaries] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("profile_id");
    if (!id) return;
    setProfileId(+id);
    api.diaries(+id).then(setDiaries).catch((e) => setErr(e.userMessage));
  }, []);

  if (!profileId) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-20 text-center">
        <LeafIcon className="mx-auto h-16 w-16" />
        <h1 className="font-display mt-4 text-3xl text-ink">日记</h1>
        <p className="mt-2 text-sm text-moss">先建立档案，才能记录你的每一天。</p>
        <Link href="/onboarding" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm font-medium text-cream">
          开始建档
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-keylime/70">
        <div className="mx-auto flex max-w-3xl items-end justify-between px-4 py-8">
          <div>
            <HeroTitle eyebrow="Diary · 日记" lines={[{ text: "每一天的" }, { text: "自己", accent: true }]} />
            <p className="mt-2 text-sm text-ink/70">回看写下的心情，看见自己的变化。</p>
          </div>
          <LeafIcon className="h-16 w-16 shrink-0 opacity-80" />
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-3 px-4">
        {err && <Card><p className="text-sm text-danger">{err}</p></Card>}
        {!diaries.length && !err && (
          <Card>
            <p className="text-sm text-moss">
              还没有日记。去 <Link href="/" className="text-meadow underline">今日</Link> 写第一篇吧。
            </p>
          </Card>
        )}
        {diaries.map((d) => (
          <Card key={d.id}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-moss">{d.day}</span>
              <Tag tone="rose">{MOOD_EMOJI[d.mood] || "😐"} {d.tag || d.mood}</Tag>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{d.diary}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

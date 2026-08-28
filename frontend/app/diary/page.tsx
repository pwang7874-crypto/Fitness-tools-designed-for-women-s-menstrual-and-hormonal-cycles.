"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type DiaryRecord } from "@/lib/api";
import { MOOD_ICON } from "@/lib/constants";
import StatusIcon from "@/components/StatusIcon";
import { errorMessage } from "@/lib/utils";
import { useProfile } from "@/lib/useProfile";
import {
  Card, EmptyState, ErrorBanner, LinkButton, LoadingState, PageHero, SectionHeading, Tag,
} from "@/components/ui";

export default function DiaryPage() {
  const { profile, loading } = useProfile();
  const [diaries, setDiaries] = useState<DiaryRecord[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async (profileId: number) => {
    try {
      setDiaries(await api.diaries(profileId));
    } catch (reason) {
      setError(errorMessage(reason, "无法读取私密记录"));
    }
  }, []);

  useEffect(() => {
    if (profile?.mood_consent) void load(profile.profile_id);
  }, [profile, load]);

  if (loading) return <LoadingState label="正在读取你的私密记录" />;
  if (!profile) {
    return <EmptyState title="尚未建立档案" description="先完成建档，才能决定是否保存心情与私密记录。"
      action={<LinkButton href="/onboarding">开始建档</LinkButton>} />;
  }
  if (!profile.mood_consent) {
    return (
      <>
        <PageHero eyebrow="Diary · 记录" title="文字留给" accent="你自己" description="你没有开启情绪与日记授权，因此这里不会保存内容。" />
        <EmptyState title="私密记录未启用" description="如需启用，请前往“我的”。日记不会被 AI 分析或用于推断情绪。"
          action={<LinkButton href="/profile">管理授权</LinkButton>} />
      </>
    );
  }

  const remove = async (id: number) => {
    if (!window.confirm("只删除这篇日记原文？当天的非文本状态打卡仍会保留。")) return;
    try {
      await api.deleteDiary(profile.profile_id, id);
      await load(profile.profile_id);
    } catch (reason) {
      setError(errorMessage(reason, "删除失败"));
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Diary · 记录"
        title="写过的日子"
        accent="不被解读"
        description="情绪标签来自你自己的五档选择。日记原文只供回看，不发送给 AI，不做诊断。"
        aside={
          <div className="hero-inset w-full rounded-[20px] bg-cream p-5">
            <div className="eyebrow">Privacy</div>
            <div className="font-display mt-3 text-3xl text-ink">No mood inference</div>
            <p className="mt-5 text-xs leading-5 text-moss">你可以单独删除任一篇日记，也可以在“我的”导出或删除全部数据。</p>
          </div>
        }
      />

      <div className="page-shell pb-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Your notes" title={diaries.length ? `${diaries.length} 篇私密记录` : "还没有记录"} />
          <LinkButton href="/">回到今日记录</LinkButton>
        </div>
        {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
        {!diaries.length ? (
          <Card tint="bg-keylime">
            <p className="text-sm leading-6 text-moss">今日打卡时可选择心情并写下第一篇私密备注。</p>
          </Card>
        ) : (
          <div className="stagger grid gap-3 md:grid-cols-2">
            {diaries.map((diary) => (
              <Card key={diary.id} tint="bg-cream-2" className="flex min-h-56 flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-moss">{diary.day}</span>
                    <Tag tone="sage"><StatusIcon name={MOOD_ICON[diary.mood]} className="!h-5 !w-5" /> {diary.tag}</Tag>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-charcoal">{diary.diary}</p>
                </div>
                <button type="button" className="interactive mt-6 self-start rounded-[7px] px-2 py-1 text-xs text-danger hover:bg-danger/8"
                  onClick={() => void remove(diary.id)}>删除这篇原文</button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

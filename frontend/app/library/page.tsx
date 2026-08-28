"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Exercise } from "@/lib/api";
import { EQUIPMENT, MUSCLE_ZH } from "@/lib/constants";
import { errorMessage, videoUrl } from "@/lib/utils";
import {
  Card, ErrorBanner, inputCls, LoadingState, PageHero, SectionHeading, Tag,
} from "@/components/ui";

const categoryLabels: Record<string, string> = {
  legs: "腿部", chest: "胸部", back: "背部", shoulders: "肩部",
  arms: "手臂", abs: "核心", calves: "小腿",
};
const levelLabels: Record<string, string> = {
  beginner: "入门", intermediate: "中级", advanced: "进阶",
};
const equipmentLabels = new Map(EQUIPMENT.map((item) => [item.value, item.label]));

export default function LibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [homeOnly, setHomeOnly] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.exercises()
      .then(setExercises)
      .catch((reason) => setError(errorMessage(reason, "无法读取动作库")));
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesQuery = !keyword ||
        exercise.name_zh.includes(keyword) ||
        exercise.name_en.toLowerCase().includes(keyword) ||
        exercise.primary_muscles.some((muscle) => (MUSCLE_ZH[muscle] || muscle).includes(keyword));
      return matchesQuery &&
        (category === "all" || exercise.category === category) &&
        (level === "all" || exercise.level === level) &&
        (!homeOnly || exercise.home_friendly);
    });
  }, [exercises, query, category, level, homeOnly]);

  return (
    <div>
      <PageHero
        eyebrow="Library · 动作库"
        title="每个动作"
        accent="都来自审核库"
        description="训练计划和教练替换都只能使用这些动作，并再次检查经验等级、器械与伤病限制。"
        aside={
          <div className="grid w-full grid-cols-2 gap-2">
            <div className="hero-inset rounded-[20px] bg-cream p-4">
              <div className="font-display text-4xl text-ink">{exercises.length || "—"}</div>
              <div className="mt-1 text-xs text-moss">审核动作</div>
            </div>
            <div className="hero-inset rounded-[20px] bg-cream p-4">
              <div className="font-display text-4xl text-ink">{filtered.length}</div>
              <div className="mt-1 text-xs text-moss">当前结果</div>
            </div>
          </div>
        }
      />

      <div className="page-shell pb-14">
        <Card tint="bg-keylime">
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
            <input className={inputCls()} type="search" value={query}
              placeholder="搜索动作、英文名或肌群" onChange={(event) => setQuery(event.target.value)} />
            <select className={inputCls()} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">全部部位</option>
              {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className={inputCls()} value={level} onChange={(event) => setLevel(event.target.value)}>
              <option value="all">全部难度</option>
              {Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" aria-pressed={homeOnly} onClick={() => setHomeOnly((value) => !value)}
              className={`interactive min-h-11 rounded-[10px] px-4 text-sm ${homeOnly ? "bg-ink text-cream" : "bg-cream text-ink"}`}>
              居家可练
            </button>
          </div>
        </Card>

        {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
        {!exercises.length && !error ? <LoadingState label="正在加载审核动作库" /> : (
          <>
            <div className="my-7 flex items-end justify-between gap-4">
              <SectionHeading eyebrow="Results" title={`${filtered.length} 个动作`} />
              <span className="text-xs text-moss">教学链接打开站外搜索结果</span>
            </div>
            <div className="stagger grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((exercise, index) => (
                <Card key={exercise.id} tint={index % 3 === 0 ? "bg-sage" : index % 3 === 1 ? "bg-cream-2" : "bg-slate"}
                  className="flex min-h-72 flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Tag tone="cream">{categoryLabels[exercise.category] || exercise.category}</Tag>
                      <Tag tone="cream">{levelLabels[exercise.level] || exercise.level}</Tag>
                      {exercise.home_friendly && <Tag tone="ink">居家</Tag>}
                    </div>
                    <h2 className="font-display mt-5 text-3xl leading-tight text-ink">{exercise.name_zh}</h2>
                    <p className="mt-1 text-xs text-moss">{exercise.name_en}</p>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {exercise.primary_muscles.map((muscle) => (
                        <Tag key={muscle} tone="cream">{MUSCLE_ZH[muscle] || muscle}</Tag>
                      ))}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-moss">
                      器械：{exercise.equipment.map((item) =>
                        item === "bodyweight" ? "徒手" : item === "gym_mat" ? "瑜伽垫" : equipmentLabels.get(item) || item
                      ).join(" / ")}
                    </p>
                  </div>
                  <a href={videoUrl(exercise.name_zh)} target="_blank" rel="noreferrer"
                    className="interactive mt-6 inline-flex self-start rounded-[10px] bg-ink px-4 py-2.5 text-sm text-cream">
                    查看动作教学 ↗
                  </a>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

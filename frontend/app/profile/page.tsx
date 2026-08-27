"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { GOALS, EXPERIENCE, CYCLE_MODES, EQUIPMENT, INJURED } from "@/lib/constants";
import { Card, PillButton, ErrorBanner } from "@/components/ui";

const labelOf = (list: { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label || v;

export default function Profile() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("profile_id");
    if (!id) {
      router.push("/onboarding");
      return;
    }
    setProfileId(+id);
    api.export(+id).then(setData).catch((e) => setErr(e.userMessage));
  }, [router]);

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cyclefit_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doDelete = async () => {
    if (!profileId) return;
    await api.deleteProfile(profileId);
    localStorage.removeItem("profile_id");
    router.push("/onboarding");
  };

  if (!data) return null;

  const p = data.profile?.[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">我的</h1>
        <p className="mt-1 text-sm text-moss">你的数据由你掌控。</p>
      </div>

      {err && <ErrorBanner message={err} />}

      <Card>
        <h2 className="font-display text-lg font-bold text-ink">档案</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-moss">目标</div><div>{labelOf(GOALS, p?.goal)}</div>
          <div className="text-moss">经验</div><div>{labelOf(EXPERIENCE, p?.experience_level)}</div>
          <div className="text-moss">频率</div><div>每周 {p?.weekly_frequency} 次</div>
          <div className="text-moss">时长</div><div>{p?.session_minutes} 分钟</div>
          <div className="text-moss">周期状态</div><div>{labelOf(CYCLE_MODES, p?.cycle_mode)}</div>
          <div className="text-moss">器械</div>
          <div>{p?.equipment?.length ? p.equipment.map((e: string) => labelOf(EQUIPMENT, e)).join("、") : "居家徒手"}</div>
          <div className="text-moss">伤病部位</div>
          <div>{p?.injured_areas?.length ? p.injured_areas.map((e: string) => labelOf(INJURED, e)).join("、") : "无"}</div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold text-ink">数据控制</h2>
        <p className="mt-2 text-sm text-moss">
          共 {data.checkins?.length || 0} 次打卡、{data.plans?.length || 0} 份计划、{data.sessions?.length || 0} 次训练记录。周期与情绪均按敏感数据本地保存。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <PillButton variant="ghost" onClick={download}>导出数据（JSON）</PillButton>
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-danger">确认删除？不可恢复</span>
              <PillButton variant="danger" onClick={doDelete}>确认删除</PillButton>
              <PillButton variant="ghost" onClick={() => setConfirming(false)}>取消</PillButton>
            </div>
          ) : (
            <PillButton variant="danger" onClick={() => setConfirming(true)}>删除全部数据</PillButton>
          )}
        </div>
      </Card>
    </div>
  );
}

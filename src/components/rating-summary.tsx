/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase rating tables use the audited runtime schema until generated client types are refreshed. */
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type RatingSummaryProps = { targetType: "member" | "load"; targetId?: string | number | null; className?: string };

export function RatingSummary({ targetType, targetId, className = "" }: RatingSummaryProps) {
  const [summary, setSummary] = useState<{ average: number; count: number } | null>(null);
  useEffect(() => {
    let active = true;
    async function fetchSummary() {
      if (targetId == null || String(targetId).length === 0) { setSummary(null); return; }
      const column = targetType === "member" ? "target_member_id" : "target_load_id";
      const { data, error } = await (supabase as any).from("ratings")
        .select("score").eq("target_type", targetType).eq(column, targetId).eq("is_visible", true);
      if (!active) return;
      if (error || !data?.length) { setSummary(null); return; }
      const scores = data.map((item: { score: number }) => Number(item.score)).filter((score: number) => score >= 1 && score <= 5);
      setSummary(scores.length ? { average: scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length, count: scores.length } : null);
    }
    void fetchSummary();
    return () => { active = false; };
  }, [targetType, targetId]);
  if (!summary) return <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`} aria-label="هنوز امتیازی ثبت نشده است"><Star className="size-3.5" />بدون امتیاز</span>;
  return <span className={`inline-flex items-center gap-1 text-xs ${className}`} aria-label={`امتیاز ${summary.average.toFixed(1)} از ۵، بر پایه ${summary.count} رأی`}>
    <Star className="size-3.5 fill-amber-400 text-amber-500" />
    <strong>{summary.average.toLocaleString("fa-IR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</strong>
    <span className="text-muted-foreground">({summary.count.toLocaleString("fa-IR")})</span>
  </span>;
}

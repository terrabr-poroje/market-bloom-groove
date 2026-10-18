import { useEffect, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type RatingFormProps = {
  orderId: string;
  reviewerMemberId: string;
  targetType: "member" | "load";
  targetId: string;
  title: string;
};

export function RatingForm({ orderId, reviewerMemberId, targetType, targetId, title }: RatingFormProps) {
  const [score, setScore] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingRating, setExistingRating] = useState<{ score: number; review_text: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    async function checkExisting() {
      const { data, error } = await (supabase as any).from("ratings")
        .select("score, review_text")
        .eq("order_id", orderId)
        .eq("reviewer_member_id", reviewerMemberId)
        .eq("target_type", targetType)
        .maybeSingle();
      if (!active) return;
      if (!error && data) setExistingRating(data);
      setCheckingExisting(false);
    }
    void checkExisting();
    return () => { active = false; };
  }, [orderId, reviewerMemberId, targetType]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = {
      order_id: orderId,
      reviewer_member_id: reviewerMemberId,
      target_type: targetType,
      target_member_id: targetType === "member" ? targetId : null,
      target_load_id: targetType === "load" ? targetId : null,
      score,
      review_text: reviewText.trim() || null,
    };
    const { error } = await (supabase as any).from("ratings").insert(payload);
    if (error) {
      const duplicate = error.code === "23505";
      setMessage(duplicate
        ? "برای این سفارش قبلاً امتیاز ثبت کرده‌اید."
        : "ثبت امتیاز ممکن نشد. فقط برای سفارش تحویل‌شده و حساب خریدار همان سفارش امکان ثبت وجود دارد.");
    } else {
      setSubmitted(true);
      setMessage("امتیاز شما ثبت شد.");
    }
    setBusy(false);
  }

  if (checkingExisting) return <p className="mt-3 text-xs text-muted-foreground">در حال بررسی سابقه امتیاز…</p>;
  if (existingRating) return <div className="mt-3 rounded-lg border border-border bg-market-surface p-3 text-sm"><p className="font-semibold">امتیاز این بخش ثبت شده است</p><p className="mt-1 text-amber-600">{"★".repeat(existingRating.score)}{"☆".repeat(5 - existingRating.score)} <span className="text-xs text-muted-foreground">{existingRating.score} از ۵</span></p>{existingRating.review_text && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{existingRating.review_text}</p>}</div>;
  if (submitted) return <p role="status" className="text-xs font-medium text-primary">{message}</p>;

  return (
    <form onSubmit={submit} className="mt-3 rounded-lg border border-border bg-market-surface p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 flex items-center gap-1" role="group" aria-label="انتخاب امتیاز از یک تا پنج ستاره">
        {[1, 2, 3, 4, 5].map(value => (
          <button key={value} type="button" onClick={() => setScore(value)} aria-label={`${value} ستاره`} aria-pressed={score === value} className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <Star className={`size-5 ${value <= score ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
          </button>
        ))}
        <span className="mr-2 text-xs text-muted-foreground">{score} از ۵</span>
      </div>
      <label className="mt-2 block text-xs text-muted-foreground">نظر کوتاه (اختیاری)
        <textarea value={reviewText} onChange={e => setReviewText(e.target.value.slice(0, 500))} rows={2} maxLength={500} className="field-input mt-1 resize-y" placeholder="تجربه خود را بنویسید…" />
      </label>
      {message && <p role="status" className="mt-2 text-xs text-destructive">{message}</p>}
      <Button type="submit" size="sm" disabled={busy} className="mt-3">{busy ? "در حال ثبت…" : "ثبت امتیاز"}</Button>
    </form>
  );
}

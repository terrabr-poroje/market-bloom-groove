import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type RatingFormProps = {
  reviewerMemberId: string;
  targetType: "member" | "load";
  targetId: string;
  title: string;
};

export function RatingForm({ reviewerMemberId, targetType, targetId, title }: RatingFormProps) {
  const [score, setScore] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = {
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
        ? "برای این مورد قبلاً امتیاز ثبت کرده‌اید."
        : "ثبت امتیاز ممکن نشد. فقط برای سفارش تحویل‌شده و حساب خریدار همان سفارش امکان ثبت وجود دارد.");
    } else {
      setSubmitted(true);
      setMessage("امتیاز شما ثبت شد.");
    }
    setBusy(false);
  }

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

import { useEffect, useState, type FormEvent } from "react";
import { Send, Star } from "lucide-react";
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
  const [existingRating, setExistingRating] = useState<{ id: string; score: number; review_text: string | null } | null>(null);
  const [thread, setThread] = useState<{ id: string; sender_user_id: string; message: string; created_at: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? "")); }, []);

  useEffect(() => {
    let active = true;
    async function checkExisting() {
      const { data, error } = await (supabase as any).from("ratings")
        .select("id, score, review_text")
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

  useEffect(() => {
    let active = true;
    async function loadThread() {
      if (!existingRating?.id) return;
      const { data, error } = await (supabase as any).from("rating_messages").select("id, sender_user_id, message, created_at").eq("rating_id", existingRating.id).order("created_at", { ascending: true });
      if (active && !error) setThread(data ?? []);
    }
    void loadThread();
    return () => { active = false; };
  }, [existingRating?.id]);

  async function sendFollowUp(event: FormEvent) {
    event.preventDefault();
    if (!existingRating?.id || !followUp.trim()) return;
    setSendingMessage(true); setMessage("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setMessage("برای ارسال پیام باید وارد حساب خود شوید."); setSendingMessage(false); return; }
    const { error } = await (supabase as any).from("rating_messages").insert({ rating_id: existingRating.id, sender_user_id: authData.user.id, message: followUp.trim() });
    if (error) setMessage("ارسال پیام انجام نشد؛ دوباره تلاش کنید.");
    else {
      setFollowUp("");
      const { data } = await (supabase as any).from("rating_messages").select("id, sender_user_id, message, created_at").eq("rating_id", existingRating.id).order("created_at", { ascending: true });
      setThread(data ?? []); setMessage("پیام شما برای بررسی ترابار ارسال شد.");
    }
    setSendingMessage(false);
  }

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
    const { data: inserted, error } = await (supabase as any).from("ratings").insert(payload).select("id, score, review_text").single();
    if (error) {
      const duplicate = error.code === "23505";
      setMessage(duplicate
        ? "برای این سفارش قبلاً امتیاز ثبت کرده‌اید."
        : "ثبت امتیاز ممکن نشد. فقط برای سفارش تحویل‌شده و حساب خریدار همان سفارش امکان ثبت وجود دارد.");
    } else {
      setSubmitted(true);
      setExistingRating(inserted);
      setMessage("امتیاز شما ثبت شد.");
    }
    setBusy(false);
  }

  if (checkingExisting) return <p className="mt-3 text-xs text-muted-foreground">در حال بررسی سابقه امتیاز…</p>;
  if (existingRating) return <div className="mt-3 rounded-lg border border-border bg-market-surface p-3 text-sm">
    <p className="font-semibold">امتیاز این بخش ثبت شده است</p>
    <p className="mt-1 text-amber-600">{"★".repeat(existingRating.score)}{"☆".repeat(5 - existingRating.score)} <span className="text-xs text-muted-foreground">{existingRating.score} از ۵</span></p>
    {existingRating.review_text && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{existingRating.review_text}</p>}
    <div className="mt-3 rounded-md border border-border p-3">
      <p className="font-semibold">پیام تکمیلی برای بررسی نظر</p>
      <p className="mt-1 text-xs text-muted-foreground">اگر لازم است جزئیات بیشتری درباره کیفیت، بسته‌بندی، تازگی یا تحویل توضیح دهید، پیام بفرستید. تیم ترابار می‌تواند از همین مسیر پاسخ دهد.</p>
      <div className="mt-3 grid gap-2">{thread.map(item => <div key={item.id} className="rounded bg-background p-2"><p className="text-xs text-muted-foreground">{item.sender_user_id === currentUserId ? "شما" : "پشتیبانی ترابار"} · {new Date(item.created_at).toLocaleString("fa-IR")}</p><p className="mt-1 whitespace-pre-wrap">{item.message}</p></div>)}</div>
      <form onSubmit={sendFollowUp} className="mt-3 grid gap-2"><textarea value={followUp} onChange={e => setFollowUp(e.target.value.slice(0, 2000))} maxLength={2000} rows={3} className="field-input resize-y" placeholder="پیام تکمیلی خود را بنویسید…" /><Button type="submit" size="sm" disabled={sendingMessage || !followUp.trim()}><Send className="ml-1 size-4" />{sendingMessage ? "در حال ارسال…" : "ارسال پیام"}</Button></form>
      {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
    </div>
  </div>;
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

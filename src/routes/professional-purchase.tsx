import { createFileRoute } from "@tanstack/react-router";
import { Requests } from "@/routes/requests";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/professional-purchase")({
  head: () => pageHead("خرید ویژه حرفه‌ای | ترابار", "مشاهده بارهای موجود با نوع فروش ویژه حرفه‌ای؛ این بارها در بازار عادی نمایش داده نمی‌شوند."),
  component: ProfessionalPurchasePage,
});

function ProfessionalPurchasePage() {
  return <Requests professionalOnly />;
}

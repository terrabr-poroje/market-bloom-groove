import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "./requests";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/orders")({
  head: () => pageHead("درخواست سفارش و پیگیری", "ثبت درخواست چندمحصولی و پیگیری وضعیت خریدها و درخواست‌های تأمین در ترابار.", "/orders"),
  component: OrdersPage,
});

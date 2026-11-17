import type { Metadata } from "next";
import { ReviewQueuePage } from "@/components/review/ReviewQueuePage";

export const metadata: Metadata = {
  title: "Review queue — Parallax",
};

export default function ReviewsRoute() {
  return <ReviewQueuePage />;
}

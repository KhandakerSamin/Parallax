import type { Metadata } from "next";
import { RelatedWorkPage } from "@/components/related/RelatedWorkPage";

export const metadata: Metadata = {
  title: "Explore prior work — Parallax",
};

export default function RelatedWorkRoute() {
  return <RelatedWorkPage />;
}

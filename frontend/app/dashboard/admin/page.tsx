import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata: Metadata = {
  title: "Administration — Parallax",
};

export default function AdminRoute() {
  return <AdminPage />;
}

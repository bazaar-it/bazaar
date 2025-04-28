// src/app/dashboard/page.tsx
"use client";

import { redirect } from "next/navigation";

/**
 * Redirects old dashboard to the new projects page
 */
export default function Dashboard() {
  redirect("/projects");
}
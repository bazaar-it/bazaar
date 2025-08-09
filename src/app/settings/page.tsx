import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SettingsPageClient } from "./SettingsPageClient";

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  return <SettingsPageClient user={session.user} />;
}
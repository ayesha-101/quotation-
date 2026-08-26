"use server";

import { destroySession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

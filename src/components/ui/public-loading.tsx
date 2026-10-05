"use client";
import { T } from "@/i18n/language-context";
import { LoadingShell } from "./loading";
export function PublicLoading() {
  return <LoadingShell label={<T id="global.loadingSystem"/>} />;
}

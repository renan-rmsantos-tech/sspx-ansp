import { getDocumentHeader } from "../_actions/admin-actions";
import { CabecalhoClient } from "./client";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function CabecalhoPage() {
  await requireAdmin();
  const { data: header, error } = await getDocumentHeader();

  if (!header) throw new Error(error);

  return <CabecalhoClient initialHeader={header} />;
}

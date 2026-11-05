import type { Metadata } from "next";
import { registerDonorPledge } from "@/app/benfeitor/_actions/donor-actions";
import { DonorForm } from "@/app/benfeitor/_components/donor-form";
import { DonorPageLayout } from "@/app/benfeitor/_components/donor-page-layout";
import { createUploadUrl } from "@/app/form/_actions/form-actions";
import { ServerActionsProvider } from "@/components/server-actions";

export const metadata: Metadata = {
  title: "Seja um benfeitor — Arca N. S. da Providência",
  description: "Inscreva-se como benfeitor da Arca Nossa Senhora da Providência.",
};

export default function SejaUmBenfeitorPage() {
  return (
    <DonorPageLayout>
      <ServerActionsProvider actions={{ createUploadUrl, registerDonorPledge }}>
        <DonorForm />
      </ServerActionsProvider>
    </DonorPageLayout>
  );
}

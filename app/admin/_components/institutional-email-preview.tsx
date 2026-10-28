import type { DocumentHeaderData } from "@/lib/documents/document-header";
import { renderInstitutionalEmail } from "@/lib/email/donor-welcome-template";
import { institutionalEmailPreviewHtml } from "@/lib/email/institutional-email-preview";

export function InstitutionalEmailPreview({ bodyHtml, header }: {
  bodyHtml: string;
  header: DocumentHeaderData;
}) {
  const rendered = renderInstitutionalEmail("", bodyHtml, header);
  return <div dangerouslySetInnerHTML={{ __html: institutionalEmailPreviewHtml(rendered.html) }} />;
}

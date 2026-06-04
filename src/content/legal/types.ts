export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocumentMeta = {
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  privacyHref?: string;
  helpHref?: string;
};

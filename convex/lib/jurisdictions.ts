/** Jurisdiction packs for Folio. Cook is live; NYC is a stub. */

export type JurisdictionConfig = {
  id: string;
  label: string;
  shortLabel: string;
  court: string;
  fiveDay: string;
  openDataNote: string;
  legalAidUrl?: string;
};

export const COOK: JurisdictionConfig = {
  id: "cook-county-il",
  label: "Cook County · Chicago (wedge)",
  shortLabel: "Cook County",
  court: "Circuit Court of Cook County, Municipal Department, Housing Section",
  fiveDay: "Illinois 735 ILCS 5/9-209 — five-day notice for nonpayment of rent.",
  openDataNote:
    "City of Chicago Building Violations (SODA 22u3-xenr). Building-level rows — confirm they match your unit.",
  legalAidUrl:
    "https://www.illinoislegalaid.org/legal-information/avoiding-eviction",
};

export const NYC: JurisdictionConfig = {
  id: "nyc-ny",
  label: "New York City (stub)",
  shortLabel: "NYC",
  court: "Housing Court, Civil Court of the City of New York",
  fiveDay: "Stub — NYC notice periods vary by tenancy and claim; not wired.",
  openDataNote: "Stub — HPD / DOB open data not wired in this release.",
};

export const JURISDICTIONS: JurisdictionConfig[] = [COOK, NYC];

export function getJurisdiction(id: string): JurisdictionConfig {
  return JURISDICTIONS.find((j) => j.id === id) ?? COOK;
}

export const DEFAULT_JURISDICTION_ID = COOK.id;

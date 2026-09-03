import { COOK } from "./jurisdiction";

export type CrawledRecord = {
  agency: string;
  kind: string;
  title: string;
  url: string;
  extracted: Record<string, unknown>;
  rawExcerpt: string;
};

function soqlNeedle(street: string): string {
  return street
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function soda<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

type ViolationRow = {
  id?: string;
  address?: string;
  violation_date?: string;
  violation_status?: string;
  violation_code?: string;
  violation_description?: string;
  violation_ordinance?: string;
  department_bureau?: string;
};

type LicenseRow = {
  id?: string;
  address?: string;
  doing_business_as_name?: string;
  license_description?: string;
  license_status?: string;
  legal_name?: string;
};

export async function crawlChicagoBuilding(
  street: string,
): Promise<CrawledRecord[]> {
  const needle = soqlNeedle(street);
  if (needle.length < 5) return [];
  const openWhere = encodeURIComponent(
    `upper(address) like '%${needle}%' AND violation_status='OPEN'`,
  );
  const anyWhere = encodeURIComponent(`upper(address) like '%${needle}%'`);
  const openUrl = `${COOK.violationsApi}?$limit=8&$order=violation_date DESC&$where=${openWhere}`;
  const anyUrl = `${COOK.violationsApi}?$limit=8&$order=violation_date DESC&$where=${anyWhere}`;
  const licenseUrl = `${COOK.licensesApi}?$limit=4&$order=date_issued DESC&$where=${anyWhere}`;

  const [openViolations, licenses] = await Promise.all([
    soda<ViolationRow>(openUrl),
    soda<LicenseRow>(licenseUrl),
  ]);
  let violations = openViolations;
  if (violations.length === 0) violations = await soda<ViolationRow>(anyUrl);

  const out: CrawledRecord[] = [];
  for (const v of violations) {
    out.push({
      agency: "Chicago Buildings",
      kind: "violation",
      title: `${v.violation_status ?? "STATUS"} · ${v.violation_description ?? "Violation"}`,
      url: `${COOK.buildingsUrl}/explore`,
      extracted: {
        code: v.violation_code ?? "",
        status: v.violation_status ?? "",
        date: (v.violation_date ?? "").slice(0, 10),
        ordinance: v.violation_ordinance ?? "",
        bureau: v.department_bureau ?? "",
        address: v.address ?? "",
        cityId: v.id ?? "",
      },
      rawExcerpt: [v.violation_description, v.violation_ordinance]
        .filter(Boolean)
        .join(" — ")
        .slice(0, 500),
    });
  }
  for (const lic of licenses) {
    out.push({
      agency: "Chicago Business Affairs",
      kind: "license",
      title: `${lic.license_description ?? "License"} · ${lic.doing_business_as_name ?? lic.legal_name ?? "entity"}`,
      url: "https://data.cityofchicago.org/Community-Economic-Development/Business-Licenses/r5kz-chrr",
      extracted: {
        legalName: lic.legal_name ?? "",
        dba: lic.doing_business_as_name ?? "",
        status: lic.license_status ?? "",
        address: lic.address ?? "",
      },
      rawExcerpt: `${lic.legal_name ?? ""} d/b/a ${lic.doing_business_as_name ?? ""}`.slice(
        0,
        400,
      ),
    });
  }
  return out;
}

export function selfHelpRecord(): CrawledRecord {
  return {
    agency: "Illinois Legal Aid",
    kind: "self_help",
    title: "Avoiding eviction — Illinois self-help",
    url: COOK.legalAidUrl,
    extracted: {
      court: COOK.court,
      fiveDay: COOK.fiveDay,
      retaliation: COOK.retaliation,
      habitability: COOK.habitability,
    },
    rawExcerpt: `${COOK.fiveDay} ${COOK.retaliation}`,
  };
}

const SUFFIX_MAP = {
  AV: "AVENUE", AVE: "AVENUE", AVENUE: "AVENUE",
  BLVD: "BOULEVARD", BOULEVARD: "BOULEVARD",
  CT: "COURT", COURT: "COURT",
  DR: "DRIVE", DRIVE: "DRIVE",
  LN: "LANE", LANE: "LANE",
  PKWY: "PARKWAY", PARKWAY: "PARKWAY",
  PL: "PLACE", PLACE: "PLACE",
  RD: "ROAD", ROAD: "ROAD",
  ST: "STREET", STREET: "STREET",
  TER: "TERRACE", TERR: "TERRACE", TERRACE: "TERRACE",
};

const DIR_MAP = {
  N: "N", NORTH: "N", S: "S", SOUTH: "S",
  E: "E", EAST: "E", W: "W", WEST: "W",
};

export const MATCH_ACCEPT_THRESHOLD = 0.85;

export function normalizeAddress(raw) {
  const cleaned = raw
    .toUpperCase()
    .replace(/[#.,]/g, " ")
    .replace(/\b(APT|APARTMENT|UNIT|STE|SUITE|#)\s*[A-Z0-9-]+\b/g, " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  let number = "";
  let direction = "";
  let suffix = "";
  const nameParts = [];

  if (tokens.length && /^\d+[A-Z]?$/.test(tokens[0])) {
    number = tokens.shift().replace(/[A-Z]/g, "");
  }
  if (tokens.length && DIR_MAP[tokens[0]]) {
    direction = DIR_MAP[tokens.shift()];
  }
  if (tokens.length && SUFFIX_MAP[tokens[tokens.length - 1]]) {
    suffix = SUFFIX_MAP[tokens.pop()];
  }
  for (const t of tokens) {
    if (DIR_MAP[t] && !direction) {
      direction = DIR_MAP[t];
      continue;
    }
    if (SUFFIX_MAP[t]) {
      suffix = SUFFIX_MAP[t];
      continue;
    }
    nameParts.push(t);
  }
  const streetName = nameParts.join(" ");
  const fullKey = [number, direction, streetName, suffix].filter(Boolean).join(" ");
  return { number, direction, streetName, suffix, fullKey };
}

export function scoreAddressMatch(fileStreet, candidateAddress) {
  const a = normalizeAddress(fileStreet);
  const b = normalizeAddress(candidateAddress);

  if (!a.number || !b.number) {
    return { score: 0, accept: false, reason: "missing_street_number" };
  }
  if (a.number !== b.number) {
    return { score: 0, accept: false, reason: "street_number_mismatch" };
  }
  if (a.direction && b.direction && a.direction !== b.direction) {
    return { score: 0, accept: false, reason: "direction_mismatch" };
  }
  if (!a.streetName || !b.streetName) {
    return { score: 0.2, accept: false, reason: "missing_street_name" };
  }
  if (a.streetName !== b.streetName) {
    const at = new Set(a.streetName.split(" "));
    const bt = new Set(b.streetName.split(" "));
    let overlap = 0;
    for (const t of at) if (bt.has(t)) overlap += 1;
    const union = new Set([...at, ...bt]).size;
    const jaccard = union ? overlap / union : 0;
    if (jaccard < 0.8) {
      return { score: jaccard * 0.5, accept: false, reason: "street_name_mismatch" };
    }
  }
  let score = 0.7;
  if (!a.direction || !b.direction || a.direction === b.direction) score += 0.1;
  if (a.streetName === b.streetName) score += 0.15;
  else score += 0.08;
  if (!a.suffix || !b.suffix || a.suffix === b.suffix) score += 0.05;
  else score -= 0.05;

  score = Math.max(0, Math.min(1, score));
  const accept = score >= MATCH_ACCEPT_THRESHOLD;
  return {
    score,
    accept,
    reason: accept ? "confident_match" : "low_confidence",
  };
}

export function sodaAddressParts(street) {
  const n = normalizeAddress(street);
  if (!n.number || n.streetName.length < 3) return null;
  return { number: n.number, nameNeedle: n.streetName };
}

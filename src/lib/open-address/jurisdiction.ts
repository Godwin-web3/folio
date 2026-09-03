/** Cook County / Chicago pack. One city is enough for the demo. */

export const COOK = {
  id: "cook-county-il",
  label: "Cook County, Illinois — City of Chicago",
  court: "Circuit Court of Cook County, Municipal Department, Housing Section",
  fiveDay: "Illinois 735 ILCS 5/9-209 — five-day notice for nonpayment of rent.",
  retaliation: "765 ILCS 720 — eviction within one year of a code complaint is presumed retaliatory.",
  habitability: "Chicago RLTO + municipal code. Open building violations support a habitability defense or set-off.",
  legalAidUrl: "https://www.illinoislegalaid.org/legal-information/avoiding-eviction",
  legalAidEmail: "intake@illinoislegalaid.org",
  buildingsUrl: "https://data.cityofchicago.org/Buildings/Building-Violations/22u3-xenr",
  violationsApi: "https://data.cityofchicago.org/resource/22u3-xenr.json",
  licensesApi: "https://data.cityofchicago.org/resource/r5kz-chrr.json",
  demo: {
    street: "1757 W Berteau Ave",
    unit: "2F",
    city: "Chicago",
    state: "IL",
    zip: "60613",
    tenant: "Maya Chen",
    tenantEmail: "maya.chen@example.com",
    owner: "Northside Residential LLC",
    ownerEmail: "notices@northside-residential.example",
    manager: "Harbor Property Group",
    clinic: "Cook County Legal Aid — Housing Desk",
    clinicEmail: "housing@illinoislegalaid.org",
    noticeText: `FIVE DAY NOTICE

TO: Maya Chen
PREMISES: 1757 W Berteau Ave, Apt 2F, Chicago, IL 60613

You are hereby notified that there is now due the undersigned landlord the sum of ONE THOUSAND EIGHT HUNDRED FORTY AND 00/100 DOLLARS ($1,840.00) being rent for the period of August 2026 for the above premises.

Unless payment of the above sum is made on or before five (5) days after service of this notice, your lease will be terminated.

LANDLORD: Northside Residential LLC
c/o Harbor Property Group
Date of service: September 1, 2026`,
  },
} as const;

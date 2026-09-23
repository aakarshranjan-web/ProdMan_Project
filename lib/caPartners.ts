/** Fictional CA partners for the escalation handoff demo. */
export interface CAPartner {
  id: string;
  name: string;
  city: string;
  specialization: string;
  rating: number;
  cases: string;
}

export const CA_PARTNERS: CAPartner[] = [
  { id: "mehta", name: "Mehta & Associates", city: "Mumbai", specialization: "MSME Disputes", rating: 4.8, cases: "120+ cases" },
  { id: "rao", name: "Rao Financial Consultants", city: "Hyderabad", specialization: "Delayed Payment Recovery", rating: 4.7, cases: "85+ cases" },
  { id: "iyer", name: "Iyer Kulkarni & Co.", city: "Pune", specialization: "MSME Disputes", rating: 4.6, cases: "60+ cases" },
];

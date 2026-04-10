import type { Service } from "@/lib/types";
export type { Service };

export const mockServices: Service[] = [
  { id: "s1", name: "Strzyżenie Męskie", price: 80, category: "Strzyżenie", isActive: true },
  { id: "s2", name: "Strzyżenie Ojciec & Syn", price: 140, category: "Strzyżenie", isActive: true },
  { id: "s3", name: "Strzyżenie + Broda Spa", price: 140, category: "Strzyżenie", isActive: true },
  { id: "s4", name: "Strzyżenie brody", price: 80, category: "Strzyżenie", isActive: true },
  {
    id: "s5",
    name: "Strzyżenie maszynką + broda maszynką",
    price: 110,
    category: "Strzyżenie",
    isActive: true,
  },
  { id: "s6", name: "Odświeżenie Strzyżenia", price: 75, category: "Strzyżenie", isActive: true },
  { id: "s7", name: "Strzyżenie Dziecięce", price: 75, category: "Strzyżenie", isActive: true },
  { id: "s8", name: "Combo & Farbowanie brody", price: 190, category: "Combo", isActive: true },
  { id: "s9", name: "Tonowanie siwych włosów", price: 70, category: "Koloryzacja", isActive: true },
  {
    id: "s10",
    name: "Farbowanie brody (beard cover)",
    price: 70,
    category: "Koloryzacja",
    isActive: true,
  },
  { id: "s11", name: "Podgalanie karku brzytwą", price: 30, category: "Dodatkowe", isActive: true },
];

export interface Product {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export const mockProducts: Product[] = [
  { id: "p1", name: "Pomada Reuzel", price: 65, isActive: true },
  { id: "p2", name: "Olejek do brody", price: 45, isActive: true },
  { id: "p3", name: "Szampon do brody", price: 35, isActive: true },
  { id: "p4", name: "Wosk matowy", price: 55, isActive: true },
  { id: "p5", name: "Tonik do włosów", price: 40, isActive: true },
];

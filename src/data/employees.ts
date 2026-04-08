export interface Employee {
  id: string;
  name: string;
  avatar: string;
  role: "admin" | "barber";
  status?: "available" | "busy" | "break";
  todayRevenue: number;
  todayServices: number;
  tipBalance: number;
}

export const mockEmployees: Employee[] = [
  {
    id: "1",
    name: "Zbyszek",
    avatar: "ZB",
    role: "admin",
    status: "available",
    todayRevenue: 225,
    todayServices: 2,
    tipBalance: 150,
  },
  {
    id: "2",
    name: "Oliwia",
    avatar: "OL",
    role: "barber",
    status: "busy",
    todayRevenue: 215,
    todayServices: 2,
    tipBalance: 85,
  },
  {
    id: "3",
    name: "Edi",
    avatar: "ED",
    role: "barber",
    todayRevenue: 350,
    todayServices: 2,
    tipBalance: 40,
  },
  {
    id: "4",
    name: "Tomek",
    avatar: "TM",
    role: "barber",
    status: "break",
    todayRevenue: 230,
    todayServices: 3,
    tipBalance: 25,
  },
  {
    id: "5",
    name: "Ewelina",
    avatar: "EW",
    role: "barber",
    status: "available",
    todayRevenue: 330,
    todayServices: 2,
    tipBalance: 110,
  },
];

export const mockStats = {
  todayServices: 11,
  yesterdayServices: 9,
  monthServices: 210,
  monthTarget: 350,
  yearServices: 2380,
  lastYearServices: 2100,
  allTimeRecord: 34,
};

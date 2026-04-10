import type { Service } from "@/lib/types";
export type { Service };

export const mockServices: Service[] = [
  {
    id: "s1",
    name: "Strzyżenie Męskie",
    price: 80,
    durationMinutes: "30-45",
    category: "Strzyżenie",
    description: "Strzyżenie + mycie + stylizacja, 30-45 min",
    descriptionLong:
      "Klasyczne strzyżenie męskie obejmujące konsultację, mycie włosów, strzyżenie nożyczkami i/lub maszynką, stylizację oraz produkt do układania. Czas wizyty 30-45 min w zależności od fryzury. Obejmuje wszystkie techniki: skin fade, taper fade, nożyczki, włosy długie.",
    isActive: true,
  },
  {
    id: "s2",
    name: "Strzyżenie Dziecięce",
    price: 75,
    durationMinutes: "30-40",
    category: "Strzyżenie",
    description: "Do lat 12, wybrani styliści. Nie obejmuje skin fade, taper fade, włosów długich",
    descriptionLong:
      "Strzyżenie dla dzieci do lat 12. Wykonywane przez wybranych stylistów z doświadczeniem w pracy z dziećmi. Usługa nie obejmuje zaawansowanych technik: skin fade, taper fade, włosów długich - w takich przypadkach należy wybrać Strzyżenie Męskie. Czas 30-40 min.",
    isActive: true,
  },
  {
    id: "s3",
    name: "Strzyżenie Męskie + Broda Spa",
    price: 140,
    durationMinutes: "60-70",
    category: "Combo",
    description:
      "Strzyżenie + broda + kompres z gorącego ręcznika + golenie brzytwą konturów, 60-70 min",
    descriptionLong:
      "Pełny pakiet: strzyżenie męskie + pielęgnacja brody w wersji spa. Obejmuje strzyżenie włosów, mycie, trimowanie i cieniowanie brody, kompres z gorącego ręcznika, precyzyjne golenie konturów brzytwą, olejek do brody i stylizację. Czas wizyty 60-70 min. Najbardziej kompleksowa usługa w ofercie.",
    isActive: true,
  },
  {
    id: "s4",
    name: "Strzyżenie Ojciec & Syn",
    price: 140,
    durationMinutes: "60-70",
    category: "Strzyżenie",
    description: "Ojciec + dziecko do lat 12, wspólna wizyta, 60-70 min",
    descriptionLong:
      "Wspólna wizyta ojca i syna (dziecko do lat 12). Obaj klienci strzyżeni podczas jednej sesji. Cena obejmuje dwa strzyżenia. Dla dziecka obowiązują te same ograniczenia co przy Strzyżeniu Dziecięcym (bez skin fade, taper fade, włosów długich). Czas 60-70 min łącznie.",
    isActive: true,
  },
  {
    id: "s5",
    name: "Strzyżenie brody",
    price: 80,
    durationMinutes: "30-40",
    category: "Broda",
    description: "Trimowanie + cieniowanie + kompres + kontur brzytwą + pielęgnacja, 30-45 min",
    descriptionLong:
      "Kompletna pielęgnacja brody: trimowanie, cieniowanie, formowanie kształtu, kompres z gorącego ręcznika, precyzyjne golenie konturów brzytwą, olejek lub balsam do brody. Czas 30-45 min. Usługa samodzielna (bez strzyżenia włosów).",
    isActive: true,
  },
  {
    id: "s6",
    name: "Strzyżenie maszynką + broda maszynką",
    price: 110,
    durationMinutes: "50",
    category: "Combo",
    description: "Strzyżenie maszynką + broda maszynką, 50 min",
    descriptionLong:
      "Pakiet combo: strzyżenie włosów maszynką (bez nożyczek) oraz trimowanie brody maszynką. Szybsza alternatywa dla pełnego combo z brodą spa. Nie obejmuje kompresów, golenia brzytwą ani zaawansowanej stylizacji brody. Czas ok. 50 min.",
    isActive: true,
  },
  {
    id: "s7",
    name: "Odświeżenie Strzyżenia",
    price: 75,
    durationMinutes: "30",
    category: "Strzyżenie",
    description:
      "Szybkie wyrównanie fryzury, wybrani fryzjerzy. Nie obejmuje skin fade, taper fade, włosów długich",
    descriptionLong:
      "Szybkie odświeżenie fryzury między pełnymi wizytami. Wyrównanie boków, karku i konturu. Wykonywane przez wybranych fryzjerów. Nie obejmuje zaawansowanych technik (skin fade, taper fade) ani włosów długich - w takich przypadkach należy wybrać Strzyżenie Męskie. Czas ok. 30 min.",
    isActive: true,
  },
  {
    id: "s8",
    name: "Combo & Farbowanie brody",
    price: 190,
    durationMinutes: "100",
    category: "Combo",
    description: "Strzyżenie + stylizacja brody + farbowanie brody, 1h 40min",
    descriptionLong:
      "Najobszerniejszy pakiet: strzyżenie męskie + pełna pielęgnacja brody + farbowanie brody. Obejmuje strzyżenie, mycie, trimowanie brody, dobór i aplikację koloru brody (beard cover), kompres, kontur brzytwą i stylizację. Czas ok. 1h 40min. Kolor dobierany indywidualnie do odcienia włosów.",
    isActive: true,
  },
  {
    id: "s9",
    name: "Tonowanie siwych włosów",
    price: 70,
    priceFrom: true,
    durationMinutes: "30",
    category: "Koloryzacja",
    description: "Męski odsiwiacz, ekspresowe pokrycie siwych włosów, 30 min",
    descriptionLong:
      "Ekspresowe tonowanie siwych włosów (męski odsiwiacz). Kolor dobierany indywidualnie. Cena od 70 zł - końcowa kwota zależy od długości włosów i ilości użytego produktu. Czas ok. 30 min. Usługa dodatkowa - można łączyć ze strzyżeniem.",
    isActive: true,
  },
  {
    id: "s10",
    name: "Farbowanie brody (beard cover)",
    price: 70,
    priceFrom: true,
    durationMinutes: "30-40",
    category: "Koloryzacja",
    description: "Odświeżenie koloru brody lub ukrycie siwizny, kolor dopasowany do włosów, 40 min",
    descriptionLong:
      "Farbowanie brody techniką beard cover. Odświeżenie koloru lub ukrycie siwizny w brodzie. Kolor dobierany indywidualnie do naturalnego odcienia włosów. Cena od 70 zł - końcowa kwota zależy od gęstości i długości brody. Czas ok. 40 min. Usługa dodatkowa - często łączona z combo.",
    isActive: true,
  },
  {
    id: "s11",
    name: "Podgalanie karku brzytwą",
    price: 30,
    durationMinutes: "15-20",
    category: "Dodatkowe",
    description:
      "Precyzyjne podgolenie baków i karku brzytwą, 15-20 min. Idealne między pełnymi wizytami",
    descriptionLong:
      "Szybka usługa uzupełniająca: precyzyjne podgolenie baków i karku brzytwą. Idealne między pełnymi wizytami, gdy fryzura wymaga tylko odświeżenia konturu. Czas 15-20 min. Najtańsza usługa w ofercie.",
    isActive: true,
  },
];

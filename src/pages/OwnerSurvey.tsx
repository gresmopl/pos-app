import { useState } from "react";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  Button,
  Radio,
  Textarea,
  CopyButton,
  Stepper,
} from "@mantine/core";
import { IconClipboard, IconCheck, IconSend } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface Question {
  id: string;
  title: string;
  description: string;
  impact: string;
  options: { value: string; label: string }[];
}

const questions: Question[] = [
  {
    id: "split_commission",
    title: "Prowizja od split payment",
    description:
      "Klient płaci 100 zł bonem + 50 zł kartą. Rachunek = 150 zł. Od czego prowizja fryzjera?",
    impact: "Logika obliczania prowizji przy płatności łączonej.",
    options: [
      { value: "full", label: "Od pełnej kwoty rachunku (150 zł) - niezależnie od metody" },
      { value: "non_voucher", label: 'Tylko od części niebonowej (50 zł) - bon to "już opłacone"' },
    ],
  },
  {
    id: "discount_commission",
    title: "Prowizja od rabatu",
    description: "Rachunek 100 zł, rabat 20%. Prowizja fryzjera od:",
    impact: "Logika obliczania prowizji przy rabacie.",
    options: [
      { value: "before", label: "Kwoty przed rabatem (100 zł)" },
      { value: "after", label: "Kwoty po rabacie (80 zł)" },
    ],
  },
  {
    id: "multi_salon",
    title: "Fryzjer w dwóch salonach",
    description: "Czy jeden pracownik może pracować w więcej niż jednym salonie?",
    impact: "Struktura bazy danych pracowników i napiwków.",
    options: [
      { value: "no", label: "Nie - jeden pracownik = jeden salon" },
      { value: "separate", label: "Tak - oddzielne salda napiwków per salon" },
      { value: "shared", label: "Tak - wspólne saldo napiwków" },
    ],
  },
  {
    id: "voucher_expiry",
    title: "Termin ważności bonu",
    description: "Czy bony podarunkowe wygasają?",
    impact: "Pole daty wygaśnięcia w bazie, walidacja przy płatności.",
    options: [
      { value: "never", label: "Nie - bon ważny bezterminowo" },
      { value: "6months", label: "Tak - po 6 miesiącach" },
      { value: "12months", label: "Tak - po 12 miesiącach" },
      { value: "custom", label: "Tak - termin ustawiany przez admina" },
    ],
  },
  {
    id: "voucher_change",
    title: "Reszta z bonu",
    description: "Klient ma bon 200 zł, rachunek 150 zł. Co z pozostałymi 50 zł?",
    impact: "Logika płatności bonem, saldo bonu.",
    options: [
      { value: "keep", label: "Zostaje na bonie (klient może użyć następnym razem)" },
      { value: "lose", label: "Przepada (bon jednorazowy)" },
      { value: "cash", label: "Reszta wydawana gotówką" },
    ],
  },
  {
    id: "undo_limit",
    title: "Cofnięcie transakcji",
    description:
      "Obecnie: tylko ostatnia transakcja + PIN operacyjny. Czy potrzebne dodatkowe ograniczenia?",
    impact: "Logika cofania transakcji, walidacja.",
    options: [
      { value: "no_limit", label: "Bez limitu - ostatnia transakcja do zamknięcia zmiany" },
      { value: "time_limit", label: "Limit czasowy (np. 30 minut)" },
      { value: "any_today", label: "Dowolna transakcja z dzisiaj (nie tylko ostatnia)" },
    ],
  },
  {
    id: "offline",
    title: "Praca offline",
    description: "Co jeśli padnie internet w salonie?",
    impact: "Architektura aplikacji. Tryb offline znacząco zwiększa złożoność.",
    options: [
      { value: "no", label: "Nie działa bez internetu - akceptowalne ryzyko" },
      { value: "full", label: "Pełny offline (zapis lokalny + synchronizacja)" },
      { value: "basic", label: "Podstawowe funkcje offline (sprzedaż), reszta wymaga netu" },
    ],
  },
  {
    id: "notifications",
    title: "Powiadomienia",
    description: "Czy chcesz dostawać powiadomienia o zdarzeniach w salonie?",
    impact: "Push notifications, koszty infrastruktury.",
    options: [
      { value: "none", label: "Nie - sprawdzam sam w aplikacji" },
      { value: "shift_close", label: "Tylko o zamknięciu zmiany" },
      { value: "shift_and_diff", label: "Zamknięcie zmiany + duża różnica kasowa (> 50 zł)" },
      { value: "all", label: "O każdej transakcji (real-time)" },
    ],
  },
  {
    id: "blind_counting",
    title: "Ślepe liczenie przy zamknięciu zmiany",
    description:
      'Pracownik liczy gotówkę w kasetce. Czy widzi "oczekiwaną kwotę systemową" ZANIM wpisze swoją policzoną wartość?',
    impact:
      "Jeśli widzi - może dopasować swoją kwotę do systemowej. Jeśli nie widzi - uczciwy audyt kasowy.",
    options: [
      {
        value: "blind",
        label: "Nie widzi - najpierw wpisuje, potem system pokazuje różnicę (prawdziwy audyt)",
      },
      {
        value: "visible",
        label: "Widzi kwotę systemową od razu - transparentność ważniejsza niż audyt",
      },
    ],
  },
  {
    id: "voucher_placement",
    title: "Sprzedaż bonów - gdzie przycisk?",
    description:
      'Bon sprzedaje się raz na tydzień. Obecnie ma osobny przycisk na ekranie głównym. Alternatywa: przenieść do "Ruchów Kasowych" jako zakładkę.',
    impact: "Układ ekranu głównego, liczba przycisków na dolnym pasku.",
    options: [
      { value: "dashboard", label: "Zostaw na ekranie głównym - szybki dostęp ważniejszy" },
      {
        value: "cash",
        label: "Przenieś do Ruchów Kasowych - rzadko używane, nie zajmuje miejsca",
      },
    ],
  },
  {
    id: "device_types",
    title: "Urządzenia w salonie",
    description:
      "Jakie urządzenia będą używane? Wpływa na to, które widoki priorytetowo dopracować.",
    impact: "Priorytet implementacji widoków (personal/station/admin).",
    options: [
      {
        value: "admin_only",
        label: "Tylko mój telefon (admin) - sam obsługuję kasę",
      },
      {
        value: "admin_station",
        label: "Mój telefon (admin) + tablet przy kasie (station)",
      },
      {
        value: "all",
        label: "Mój telefon (admin) + tablet przy kasie + telefony fryzjerów (personal)",
      },
    ],
  },
  {
    id: "cash_tips",
    title: "Napiwki gotówkowe 'do ręki'",
    description:
      "Klient daje fryzjerowi napiwek gotówką bezpośrednio (nie przez kasę). Czy rejestrować to w systemie?",
    impact: "Dokładność statystyk napiwkowych, złożoność obsługi.",
    options: [
      {
        value: "no",
        label: "Nie - gotówka do ręki to sprawa fryzjera, system nie śledzi",
      },
      {
        value: "optional",
        label:
          "Opcjonalnie - fryzjer może wpisać napiwek do ręki (do statystyk, nie wpływa na kasę)",
      },
    ],
  },
  {
    id: "discount_limit",
    title: "Limit rabatu",
    description:
      "Obecnie każdy fryzjer/kasjer może dać dowolny rabat (nawet 100%) bez ograniczeń. Czy wprowadzić kontrolę?",
    impact: "Walidacja rabatów, ewentualny PIN przy dużych rabatach.",
    options: [
      { value: "no_limit", label: "Bez limitu - ufam pracownikom" },
      {
        value: "pin_above",
        label: "Rabat powyżej 20% wymaga PIN-u operacyjnego",
      },
      {
        value: "max_percent",
        label: "Maksymalny rabat to 30% - nie da się dać więcej",
      },
      {
        value: "admin_only",
        label: "Rabaty daje tylko admin/szef (PIN wymagany zawsze)",
      },
    ],
  },
  {
    id: "cash_tolerance",
    title: "Tolerancja różnicy kasowej",
    description:
      "Przy zamknięciu zmiany policzona gotówka może się różnić od systemowej o parę złotych (drobne, zaokrąglenia). Jaka różnica jest akceptowalna?",
    impact: "Kolorowanie różnicy przy zamknięciu zmiany, ewentualne alerty.",
    options: [
      { value: "0", label: "0 zł - każda różnica jest oznaczana" },
      { value: "5", label: "Do 5 zł - drobne różnice ignorowane" },
      { value: "10", label: "Do 10 zł - tolerancja na zaokrąglenia" },
      { value: "20", label: "Do 20 zł - luźne podejście" },
    ],
  },
  {
    id: "tip_presets",
    title: "Presety napiwków",
    description:
      "W POS są szybkie przyciski napiwków: 5%, 10%, 20% od rachunku. Można też wpisać własną kwotę. Czy te wartości są dobre?",
    impact: "Przyciski napiwków na ekranie sprzedaży.",
    options: [
      { value: "5_10_20", label: "5%, 10%, 20% - ok, zostawiamy" },
      { value: "10_15_20", label: "Wolę 10%, 15%, 20%" },
      { value: "5_10_15_20", label: "Chcę 4 przyciski: 5%, 10%, 15%, 20%" },
      { value: "custom_only", label: "Tylko pole na własną kwotę, bez presetów procentowych" },
    ],
  },
  {
    id: "voucher_denominations",
    title: "Nominały bonów podarunkowych",
    description:
      "Szybkie przyciski do sprzedaży bonu: 50 zł, 100 zł, 200 zł. Można też wpisać dowolną kwotę. Pasuje?",
    impact: "Przyciski szybkiego wyboru przy sprzedaży bonu.",
    options: [
      { value: "50_100_200", label: "50, 100, 200 zł - ok" },
      { value: "100_200_300", label: "Wolę 100, 200, 300 zł" },
      { value: "50_100_150_200", label: "Chcę 4 przyciski: 50, 100, 150, 200 zł" },
      { value: "custom_only", label: "Tylko pole na własną kwotę, bez presetów" },
    ],
  },
];

export default function OwnerSurvey() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState(0);

  const currentQ = questions[step];
  const isLastQuestion = step === questions.length - 1;
  const isDone = step === questions.length;
  const answeredCount = Object.keys(answers).length;

  const setAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const generateSummary = () => {
    const lines: string[] = [
      "FORMEN - Odpowiedzi na pytania projektowe",
      `Data: ${new Date().toLocaleDateString("pl-PL")}`,
      "=".repeat(45),
      "",
    ];

    questions.forEach((q, i) => {
      const answer = answers[q.id];
      const option = q.options.find((o) => o.value === answer);
      lines.push(`${i + 1}. ${q.title}`);
      lines.push(`   ${option ? option.label : "Brak odpowiedzi"}`);
      lines.push("");
    });

    if (notes.trim()) {
      lines.push("=".repeat(45));
      lines.push("DODATKOWE UWAGI:");
      lines.push(notes.trim());
    }

    return lines.join("\n");
  };

  if (isDone) {
    const summary = generateSummary();

    return (
      <Box mih="100vh" pb={40}>
        <Container size="lg">
          <PageHeader title="Podsumowanie" backTo="/admin" />
          <Divider />

          <Stack gap="md" py="md">
            <Text fz="sm" c="dimmed">
              Odpowiedziano na {answeredCount} z {questions.length} pytań. Skopiuj tekst i wyślij.
            </Text>

            <Textarea
              label="Dodatkowe uwagi, pomysły, zgłoszenia"
              description="Wpisz tutaj cokolwiek chcesz przekazać (błędy, pomysły, zmiany)"
              placeholder="np. Chcę zmienić kolejność przycisków na ekranie głównym..."
              minRows={4}
              autosize
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
            />

            <Divider />

            <Box
              p="md"
              style={{
                borderRadius: "var(--mantine-radius-md)",
                border: "1px solid var(--mantine-color-default-border)",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                fontSize: "12px",
                lineHeight: 1.5,
                maxHeight: 300,
                overflow: "auto",
              }}
            >
              {summary}
            </Box>

            <Group>
              <CopyButton value={summary}>
                {({ copied, copy }) => (
                  <Button
                    color={copied ? "green" : "blue"}
                    leftSection={copied ? <IconCheck size={18} /> : <IconClipboard size={18} />}
                    onClick={copy}
                    size="lg"
                    fullWidth
                  >
                    {copied ? "Skopiowano!" : "Kopiuj do schowka"}
                  </Button>
                )}
              </CopyButton>
            </Group>

            <Button variant="subtle" onClick={() => setStep(0)}>
              Wróć do pytań
            </Button>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box mih="100vh" pb={120}>
      <Container size="lg">
        <PageHeader title="Ankieta dla szefa" backTo="/admin" />
        <Divider />

        <Box py="md">
          <Stepper active={step} size="xs" onStepClick={setStep}>
            {questions.map((q) => (
              <Stepper.Step
                key={q.id}
                label=""
                completedIcon={answers[q.id] ? <IconCheck size={14} /> : undefined}
                color={answers[q.id] ? "green" : "gray"}
              />
            ))}
          </Stepper>
        </Box>

        <Divider />

        <Stack gap="md" py="md">
          <div>
            <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
              Pytanie {step + 1} z {questions.length}
            </Text>
            <Text fw={700} fz="xl" mt="xs">
              {currentQ.title}
            </Text>
          </div>

          <Text fz="sm">{currentQ.description}</Text>

          <Box
            p="sm"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: "var(--mantine-color-blue-light)",
            }}
          >
            <Text fz="xs" c="blue">
              Wpływ na system: {currentQ.impact}
            </Text>
          </Box>

          <Radio.Group value={answers[currentQ.id] || ""} onChange={setAnswer}>
            <Stack gap="sm">
              {currentQ.options.map((opt) => (
                <Radio
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  styles={{
                    radio: { cursor: "pointer" },
                    label: { cursor: "pointer", fontSize: "14px" },
                  }}
                />
              ))}
            </Stack>
          </Radio.Group>
        </Stack>
      </Container>

      {/* ===== BOTTOM NAV ===== */}
      <Box
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderTop: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
        }}
        p="md"
      >
        <Container size="lg">
          <Group justify="space-between">
            <Button variant="subtle" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Wstecz
            </Button>

            {isLastQuestion ? (
              <Button
                color="green"
                leftSection={<IconSend size={18} />}
                onClick={() => setStep(questions.length)}
              >
                Podsumowanie ({answeredCount}/{questions.length})
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)}>
                {answers[currentQ.id] ? "Dalej" : "Pomiń"}
              </Button>
            )}
          </Group>
        </Container>
      </Box>
    </Box>
  );
}

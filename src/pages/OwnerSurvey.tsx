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

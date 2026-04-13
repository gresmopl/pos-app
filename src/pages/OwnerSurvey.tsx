import { useState } from "react";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  Button,
  Textarea,
  CopyButton,
  Badge,
  Radio,
} from "@mantine/core";
import { IconClipboard, IconCheck } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface OpenQuestion {
  id: string;
  question: string;
  description: string;
  options: { value: string; label: string }[];
}

const openQuestions: OpenQuestion[] = [];

const completedAnswers = [
  {
    question: "Prowizja od split payment",
    answer: "Od pełnej kwoty rachunku (niezależnie od metody)",
  },
  { question: "Prowizja od rabatu", answer: "Od kwoty po rabacie" },
  { question: "Fryzjer w dwóch salonach", answer: "Nie - jeden pracownik = jeden salon" },
  { question: "Termin ważności bonu", answer: "12 miesięcy od sprzedaży" },
  { question: "Reszta z bonu", answer: "Zostaje na bonie (klient używa następnym razem)" },
  {
    question: "Cofnięcie transakcji",
    answer: "Bez limitu - ostatnia transakcja do zamknięcia zmiany",
  },
  { question: "Praca offline", answer: "Podstawowe funkcje offline, reszta wymaga netu" },
  { question: "Powiadomienia", answer: "Nie - sprawdzam sam w aplikacji" },
  { question: "Ślepe liczenie", answer: "Widzi kwotę systemową od razu (transparentność)" },
  { question: "Sprzedaż bonów", answer: "W Ruchach Kasowych (rzadko używane)" },
  {
    question: "Urządzenia",
    answer: "Telefon szefa (admin) + tablet przy kasie + telefony fryzjerów",
  },
  { question: "Napiwki gotówkowe", answer: "System nie śledzi gotówki do ręki" },
  { question: "Limit rabatu", answer: "Bez limitu - ufam pracownikom" },
  { question: "Tolerancja kasowa", answer: "Do 10 zł (różnice <= 10 zł jako OK)" },
  { question: "Presety napiwków", answer: "Bez presetów - tylko pole na kwotę" },
  { question: "Nominały bonów", answer: "Bez presetów - tylko pole na kwotę" },
  { question: "Zdjęcie kasetki", answer: "Opcjonalne (przycisk, można pominąć)" },
  { question: "Magazyn kosmetyków", answer: "Nie - sam ogarniam co mam na półce" },
  // Odpowiedzi szefa 2026-04-13
  { question: "Stare bony (sprzed systemu)", answer: "Nie ma starych bonów" },
  { question: "Widoczność prowizji dla fryzjera", answer: "Na bieżąco na telefonie fryzjera" },
  { question: "Zmiana stawek prowizji w czasie", answer: "Zmiana natychmiastowa wystarczy" },
  { question: "Podsumowanie dnia na email", answer: "Nie - sprawdzam sam w aplikacji" },
  {
    question: "Tolerancja kasowa a nowy ekran",
    answer: "Chcę widzieć każdą różnicę (brak tolerancji)",
  },
  {
    question: "Bony papierowe przy zamknięciu zmiany",
    answer: "OK - bony liczone razem z gotówką",
  },
  // Odpowiedz szefa 2026-04-13 (nowa logika Wplat)
  {
    question: "Wpłata drobnych do kasy",
    answer: "Jeden typ dla wszystkich (zasila kasetkę + Portfel pracownika)",
  },
];

export default function OwnerSurvey(): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === openQuestions.length;

  const handleAnswer = (questionId: string, value: string): void => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const generateSummary = (): string => {
    const lines = [
      "FORMEN - Odpowiedzi szefa",
      `Data: ${new Date().toLocaleDateString("pl-PL")}`,
      "=".repeat(45),
    ];

    if (answeredCount > 0) {
      lines.push("", "NOWE ODPOWIEDZI:");
      for (const q of openQuestions) {
        const val = answers[q.id];
        if (!val) continue;
        const option = q.options.find((o) => o.value === val);
        lines.push(`- ${q.question}: ${option?.label ?? val}`);
      }
    }

    if (notes.trim()) {
      lines.push("", "UWAGI:", notes.trim());
    }

    return lines.join("\n");
  };

  const hasSomethingToCopy = answeredCount > 0 || notes.trim();

  return (
    <Box mih="100vh" pb={40}>
      <Container size="lg">
        <PageHeader title="Ankieta" backTo="/admin" />
        <Divider />

        <Stack gap="md" py="md">
          {/* === OTWARTE PYTANIA === */}
          <Group>
            <Badge color={allAnswered ? "green" : "yellow"} size="lg" variant="light">
              {allAnswered ? "Gotowe" : "Do ustalenia"}
            </Badge>
            <Text fz="sm" c="dimmed">
              {answeredCount} z {openQuestions.length} odpowiedzi
            </Text>
          </Group>

          <Stack gap={0}>
            {openQuestions.map((item, index) => (
              <div key={item.id}>
                <Stack gap="xs" py="sm">
                  <Text fz="sm" fw={600}>
                    {item.question}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    {item.description}
                  </Text>
                  <Radio.Group
                    value={answers[item.id] ?? ""}
                    onChange={(val) => handleAnswer(item.id, val)}
                  >
                    <Stack gap={6} mt={4}>
                      {item.options.map((opt) => (
                        <Radio key={opt.value} value={opt.value} label={opt.label} size="sm" />
                      ))}
                    </Stack>
                  </Radio.Group>
                </Stack>
                {index < openQuestions.length - 1 && <Divider />}
              </div>
            ))}
          </Stack>

          <Divider />

          {/* === UWAGI === */}
          <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
            Dodatkowe uwagi
          </Text>
          <Textarea
            placeholder="np. Chcę zmienić tolerancję kasową na 20 zł..."
            minRows={3}
            autosize
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          {hasSomethingToCopy && (
            <CopyButton value={generateSummary()}>
              {({ copied, copy }) => (
                <Button
                  color={copied ? "green" : "blue"}
                  leftSection={copied ? <IconCheck size={18} /> : <IconClipboard size={18} />}
                  onClick={copy}
                  size="lg"
                  fullWidth
                >
                  {copied ? "Skopiowano!" : "Kopiuj odpowiedzi do schowka"}
                </Button>
              )}
            </CopyButton>
          )}

          <Divider my="xs" />

          {/* === PODJĘTE DECYZJE === */}
          <Group>
            <Badge color="green" size="lg" variant="light">
              Zakończone
            </Badge>
            <Text fz="sm" c="dimmed">
              {completedAnswers.length} pytań rozpatrzonych (2026-04-10, 2026-04-13)
            </Text>
          </Group>

          <Stack gap={0}>
            {completedAnswers.map((item, index) => (
              <div key={index}>
                <Group justify="space-between" py="xs" wrap="nowrap" align="flex-start">
                  <Text fz="sm" fw={500} style={{ flex: "0 0 40%" }}>
                    {item.question}
                  </Text>
                  <Text fz="sm" c="dimmed" ta="right">
                    {item.answer}
                  </Text>
                </Group>
                {index < completedAnswers.length - 1 && <Divider />}
              </div>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

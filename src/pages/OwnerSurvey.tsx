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
} from "@mantine/core";
import { IconClipboard, IconCheck } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";

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
];

export default function OwnerSurvey() {
  const [notes, setNotes] = useState("");

  const generateNotesSummary = () => {
    const lines = [
      "FORMEN - Nowe uwagi / pytania od szefa",
      `Data: ${new Date().toLocaleDateString("pl-PL")}`,
      "=".repeat(45),
      "",
      notes.trim(),
    ];
    return lines.join("\n");
  };

  return (
    <Box mih="100vh" pb={40}>
      <Container size="lg">
        <PageHeader title="Ankieta" backTo="/admin" />
        <Divider />

        <Stack gap="md" py="md">
          <Group>
            <Badge color="green" size="lg" variant="light">
              Zakończona
            </Badge>
            <Text fz="sm" c="dimmed">
              Wszystkie 18 pytań zostało rozpatrzonych (2026-04-10)
            </Text>
          </Group>

          <Divider />

          {/* Podsumowanie odpowiedzi */}
          <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
            Podjęte decyzje
          </Text>
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

          <Divider />

          {/* Nowe uwagi */}
          <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
            Nowe uwagi lub pytania
          </Text>
          <Text fz="sm" c="dimmed">
            Jeśli chcesz coś zmienić, zgłosić błąd lub masz nowy pomysł - wpisz tutaj i skopiuj
            tekst.
          </Text>

          <Textarea
            placeholder="np. Chcę zmienić tolerancję kasową na 20 zł..."
            minRows={4}
            autosize
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          {notes.trim() && (
            <CopyButton value={generateNotesSummary()}>
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
          )}
        </Stack>
      </Container>
    </Box>
  );
}

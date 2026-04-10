import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Container, Stack, Text, Button, Box } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box mih="100vh">
          <Container size="sm">
            <Stack align="center" gap="lg" py={80}>
              <Box
                p="lg"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-red-light)",
                }}
              >
                <IconAlertTriangle size={48} color="var(--mantine-color-red-filled)" />
              </Box>
              <Text fw={700} fz={24} ta="center">
                Coś poszło nie tak
              </Text>
              <Text fz="sm" ta="center" c="dimmed">
                Wystąpił nieoczekiwany błąd. Spróbuj wrócić do strony głównej.
              </Text>
              {this.state.error && (
                <Text fz="xs" c="dimmed" ta="center" style={{ fontFamily: "monospace" }}>
                  {this.state.error.message}
                </Text>
              )}
              <Button onClick={this.handleReset}>Powrót do ekranu głównego</Button>
            </Stack>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

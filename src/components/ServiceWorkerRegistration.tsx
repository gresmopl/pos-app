import { useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Stack, Text } from "@mantine/core";

function promptUpdate(worker: ServiceWorker) {
  notifications.show({
    id: "sw-update",
    title: "Dostępna nowa wersja",
    message: (
      <Stack gap="xs" mt={4}>
        <Text fz="sm">Odśwież aplikację, aby załadować aktualizację.</Text>
        <Button
          size="xs"
          onClick={() => {
            worker.postMessage({ type: "SKIP_WAITING" });
          }}
        >
          Odśwież teraz
        </Button>
      </Stack>
    ),
    color: "blue",
    autoClose: false,
    withCloseButton: true,
  });
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const base = import.meta.env.BASE_URL || "/";

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(base + "sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          promptUpdate(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(newWorker);
            }
          });
        });
      })
      .catch(() => {
        // SW registration failed - silent, non-critical
      });
  }, []);

  return null;
}

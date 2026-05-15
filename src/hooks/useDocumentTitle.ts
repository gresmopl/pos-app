import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    document.title = isStandalone ? title : `FORMEN POS - ${title}`;
  }, [title]);
}

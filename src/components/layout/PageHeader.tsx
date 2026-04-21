import { type ReactNode } from "react";
import { Text, Group, ActionIcon } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "react-router";

export interface PageHeaderProps {
  title: string;
  rightSection?: ReactNode;
  backTo?: string;
  onBack?: () => void;
}

export function PageHeader({ title, rightSection, backTo = "/", onBack }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <Group justify="space-between" py="md">
      <Group gap="sm">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={onBack ?? (() => navigate(backTo))}
          aria-label="Powrót"
        >
          <IconArrowLeft size={22} />
        </ActionIcon>
        <Text fw={700} fz={24}>
          {title}
        </Text>
      </Group>
      {rightSection}
    </Group>
  );
}

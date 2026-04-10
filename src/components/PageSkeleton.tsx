import { Container, Skeleton, Stack, Group, Box } from "@mantine/core";

export function PageSkeleton() {
  return (
    <Box mih="100vh">
      <Container size="lg">
        <Group py="md" gap="sm">
          <Skeleton circle h={36} w={36} />
          <Skeleton h={24} w={200} />
        </Group>
        <Skeleton h={1} w="100%" mb="md" />
        <Stack gap="md">
          <Skeleton h={60} radius="md" />
          <Skeleton h={60} radius="md" />
          <Skeleton h={60} radius="md" />
          <Group grow>
            <Skeleton h={100} radius="md" />
            <Skeleton h={100} radius="md" />
          </Group>
          <Skeleton h={40} radius="md" />
          <Skeleton h={40} radius="md" />
        </Stack>
      </Container>
    </Box>
  );
}

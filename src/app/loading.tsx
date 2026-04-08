"use client";

import { Box, Container, Skeleton, Stack } from "@mantine/core";

export default function Loading() {
  return (
    <Box mih="100vh" pb={80}>
      <Container size="lg">
        <Skeleton height={40} mt="md" mb="md" width="40%" />
        <Skeleton height={1} mb="md" />
        <Stack gap="md">
          <Skeleton height={60} radius="md" />
          <Skeleton height={60} radius="md" />
          <Skeleton height={60} radius="md" />
          <Skeleton height={60} radius="md" />
          <Skeleton height={60} radius="md" />
        </Stack>
      </Container>
    </Box>
  );
}

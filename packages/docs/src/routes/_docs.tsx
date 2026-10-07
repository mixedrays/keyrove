import { Outlet, createFileRoute } from '@tanstack/react-router';

import { DocsLayout } from '@/components/docs-layout.tsx';

export const Route = createFileRoute('/_docs')({
  component: () => (
    <DocsLayout>
      <Outlet />
    </DocsLayout>
  ),
});

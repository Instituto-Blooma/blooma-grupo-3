import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/components/dashboard';

/** Dashboard de exemplo do template (tarefas), que antes ficava na página inicial. */
export const Route = createFileRoute('/_authenticated/dev/todos')({
  component: Dashboard,
});

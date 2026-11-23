import { createFileRoute } from '@tanstack/react-router';
import { RespiraKidsPage } from '@/respira/RespiraKidsPage';

export const Route = createFileRoute('/_authenticated/')({
  component: RespiraKidsPage,
});

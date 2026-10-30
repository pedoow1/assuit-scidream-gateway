import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route: renders whichever child is matched
// (subject page, quizzes list, or a single quiz).
export const Route = createFileRoute("/subjects/$subjectId")({
  component: () => <Outlet />,
});

import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/_authenticated/admin/logs")({ component: () => <ComingSoon title="Activity Logs" description="Audit trail of admin actions across the system." features={["Who created / edited / deleted records", "Login history & important setting changes", "Filter by admin, action type, date", "Show admin name, IP, affected record"]} /> });

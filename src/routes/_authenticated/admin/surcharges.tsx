import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/_authenticated/admin/surcharges")({ component: () => <ComingSoon title="Surcharge Management" description="Address-based and date-based surcharges." features={["Surcharge addresses (fixed or %)", "Holiday / event / Christmas surcharges", "Peak hour & weekend surcharges", "Custom date-range surcharges"]} /> });

import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/_authenticated/admin/hourly-rate")({ component: () => <ComingSoon title="Hourly Rates" description="Per-hour pricing by vehicle type." features={["Minimum hours per vehicle", "Hourly price + extra hour price", "Included mileage", "Extra mileage rate"]} /> });

import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/_authenticated/admin/reports")({ component: () => <ComingSoon title="Reports & Analytics" description="Booking, revenue, driver, vehicle and route performance reports." features={["Date-range, status, vehicle, driver filters", "Booking, revenue & cancellation reports", "Driver & vehicle performance", "Route performance", "Export to CSV / Excel / PDF"]} /> });

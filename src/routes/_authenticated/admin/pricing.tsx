import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/_authenticated/admin/pricing")({ component: () => <ComingSoon title="Pricing Management" description="Fixed-price routes, airport pricing, and zone-based rules." features={["Fixed route prices (pickup → dropoff → vehicle)", "Airport pricing matrix", "Zone-based pricing", "Extra passenger / luggage charges", "Night & weekend surcharges"]} /> });

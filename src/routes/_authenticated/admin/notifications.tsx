import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/_authenticated/admin/notifications")({ component: () => <ComingSoon title="Notifications" description="Email, SMS, and WhatsApp templates & alerts." features={["Booking confirmation email templates", "Driver assignment alerts", "Cancellation notifications", "SMS / WhatsApp placeholders", "Admin alert preferences"]} /> });

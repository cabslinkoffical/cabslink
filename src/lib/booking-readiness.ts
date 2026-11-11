type ScenicReadiness = {
  active: boolean;
  fetching: boolean;
  failed: boolean;
  quoted: boolean;
  vehicleAvailable: boolean;
  needsAcknowledgement: boolean;
};

/** The same gate protects desktop, phone, step arrows and submission. */
export function scenicBookingProblem(state: ScenicReadiness): string | null {
  if (!state.active) return null;
  if (state.failed) return "We couldn't price this right now, please try again or call us";
  if (state.fetching || !state.quoted) return "Please wait for your updated journey price.";
  if (!state.vehicleAvailable) return "That vehicle isn't available for this journey. Please choose another class.";
  if (state.needsAcknowledgement) return "Please acknowledge the service change before continuing.";
  return null;
}
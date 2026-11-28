import { expect, it } from "vitest";
import { deliveryEvent } from "@/lib/email-delivery";
it("does not confuse an accepted send with delivery", () => {
  expect(deliveryEvent("sent")).toBeNull();
  expect(deliveryEvent(undefined)).toBeNull();
});
it("recognises delivery evidence, bounces and complaints", () => {
  expect(deliveryEvent("clicked")).toBe("delivered");
  expect(deliveryEvent("bounced")).toBe("bounced");
  expect(deliveryEvent("complained")).toBe("complained");
});
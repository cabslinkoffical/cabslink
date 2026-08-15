/**
 * Bulk import/export entity registry.
 *
 * Client-safe: the admin UI uses this for column hints and template downloads,
 * the server uses it to whitelist + coerce every incoming cell.
 */
export type BulkFieldType = "string" | "number" | "boolean" | "date" | "time" | "timestamp" | "strings" | "ints";

export type BulkField = {
  name: string;
  type: BulkFieldType;
  required?: boolean;
};

export type BulkEntity = {
  key: string;
  label: string;
  table: string;
  /** Natural key used to update existing rows when no id is supplied. */
  naturalKey?: string;
  orderBy: string;
  fields: BulkField[];
};

const geoFields: BulkField[] = [
  { name: "place_id", type: "string" },
  { name: "place_label", type: "string" },
  { name: "lat", type: "number" },
  { name: "lng", type: "number" },
  { name: "radius_miles", type: "number" },
  { name: "scope", type: "string" },
];

const windowFields: BulkField[] = [
  { name: "date_from", type: "date" },
  { name: "date_to", type: "date" },
  { name: "time_from", type: "time" },
  { name: "time_to", type: "time" },
  { name: "days_of_week", type: "ints" },
];

export const BULK_ENTITIES: BulkEntity[] = [
  {
    key: "pricing_rules",
    label: "Route Pricing (fixed routes)",
    table: "pricing_rules",
    orderBy: "priority",
    fields: [
      { name: "id", type: "string" },
      { name: "from_address", type: "string", required: true },
      { name: "to_address", type: "string", required: true },
      { name: "price", type: "number", required: true },
      { name: "currency", type: "string" },
      { name: "from_place_id", type: "string" },
      { name: "from_place_label", type: "string" },
      { name: "from_lat", type: "number" },
      { name: "from_lng", type: "number" },
      { name: "from_radius_miles", type: "number" },
      { name: "to_place_id", type: "string" },
      { name: "to_place_label", type: "string" },
      { name: "to_lat", type: "number" },
      { name: "to_lng", type: "number" },
      { name: "to_radius_miles", type: "number" },
      { name: "vehicle_class_id", type: "string" },
      { name: "vehicle_id", type: "string" },
      { name: "bidirectional", type: "boolean" },
      { name: "valid_for_return", type: "boolean" },
      { name: "valid_from", type: "date" },
      { name: "valid_to", type: "date" },
      { name: "priority", type: "number" },
      { name: "notes", type: "string" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "location_pricing_rules",
    label: "Location Pricing (zones)",
    table: "location_pricing_rules",
    naturalKey: "name",
    orderBy: "priority",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "price", type: "number", required: true },
      { name: "price_type", type: "string" },
      { name: "included_distance_miles", type: "number" },
      { name: "extra_per_mile", type: "number" },
      ...geoFields,
      { name: "vehicle_class_id", type: "string" },
      { name: "priority", type: "number" },
      { name: "notes", type: "string" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "pricing_modifiers",
    label: "Pricing Modifiers (surge / uplift / discount)",
    table: "pricing_modifiers",
    naturalKey: "name",
    orderBy: "priority",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "modifier_type", type: "string" },
      { name: "value", type: "number", required: true },
      ...geoFields,
      ...windowFields,
      { name: "service_types", type: "strings" },
      { name: "vehicle_class_id", type: "string" },
      { name: "stackable", type: "boolean" },
      { name: "priority", type: "number" },
      { name: "notes", type: "string" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "availability_rules",
    label: "Availability Rules (block / allow)",
    table: "availability_rules",
    naturalKey: "name",
    orderBy: "priority",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "effect", type: "string" },
      { name: "rule_scope", type: "string" },
      ...geoFields,
      ...windowFields,
      { name: "service_types", type: "strings" },
      { name: "vehicle_class_id", type: "string" },
      { name: "vehicle_id", type: "string" },
      { name: "priority", type: "number" },
      { name: "reason", type: "string" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "hourly_rates",
    label: "Hourly & Daily Rates",
    table: "hourly_rates",
    orderBy: "priority",
    fields: [
      { name: "id", type: "string" },
      { name: "price_per_hour", type: "number", required: true },
      { name: "daily_price", type: "number" },
      { name: "min_hours", type: "number" },
      { name: "max_hours", type: "number" },
      { name: "included_miles_per_hour", type: "number" },
      { name: "included_miles_per_day", type: "number" },
      { name: "included_hours_per_day", type: "number" },
      { name: "extra_mile_rate", type: "number" },
      { name: "currency", type: "string" },
      { name: "vehicle_class_id", type: "string" },
      { name: "vehicle_id", type: "string" },
      { name: "display_order", type: "number" },
      { name: "priority", type: "number" },
      { name: "notes", type: "string" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "surcharges",
    label: "Surcharges",
    table: "surcharges",
    naturalKey: "name",
    orderBy: "priority",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "amount", type: "number", required: true },
      { name: "charge_type", type: "string" },
      { name: "applies_to", type: "string" },
      { name: "days_of_week", type: "ints" },
      { name: "time_from", type: "time" },
      { name: "time_to", type: "time" },
      { name: "starts_at", type: "timestamp" },
      { name: "ends_at", type: "timestamp" },
      { name: "vehicle_class_id", type: "string" },
      { name: "vehicle_id", type: "string" },
      { name: "priority", type: "number" },
      { name: "notes", type: "string" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "coupons",
    label: "Coupons",
    table: "coupons",
    naturalKey: "code",
    orderBy: "created_at",
    fields: [
      { name: "id", type: "string" },
      { name: "code", type: "string", required: true },
      { name: "discount_type", type: "string" },
      { name: "discount_value", type: "number", required: true },
      { name: "min_booking_amount", type: "number" },
      { name: "max_discount", type: "number" },
      { name: "usage_limit", type: "number" },
      { name: "per_customer_limit", type: "number" },
      { name: "applies_to_service_types", type: "strings" },
      { name: "applicable_vehicle_classes", type: "strings" },
      { name: "stackable", type: "boolean" },
      { name: "starts_at", type: "timestamp" },
      { name: "expires_at", type: "timestamp" },
      { name: "notes", type: "string" },
      { name: "active", type: "boolean" },
    ],
  },
];

export function getBulkEntity(key: string): BulkEntity | undefined {
  return BULK_ENTITIES.find((e) => e.key === key);
}

/** Header row for a blank template download. */
export function templateHeaders(entity: BulkEntity): string[] {
  return entity.fields.filter((f) => f.name !== "id").map((f) => f.name);
}

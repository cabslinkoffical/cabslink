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
  /** Helper column accepted in the file but never written to the database. */
  virtual?: boolean;
};

/**
 * Tells the importer to look a Place ID up from plain address text, so a
 * spreadsheet never has to carry Google IDs.
 */
export type BulkGeoSpec = {
  /** Column that receives the Google Place ID. */
  placeId: string;
  /** Address columns to search, first non-empty wins. */
  text: string[];
  /** Extra columns appended to the search text for disambiguation. */
  context?: string[];
  /** Optional columns filled from the same lookup. */
  label?: string;
  lat?: string;
  lng?: string;
};

/**
 * Tells the importer to fill a uuid column (e.g. `vehicle_class_id`) from a
 * plain name or slug typed in the spreadsheet, so nobody has to paste IDs.
 */
export type BulkRefSpec = {
  /** Column that receives the uuid. */
  idField: string;
  /** Columns that may carry the human name or slug. */
  textFields: string[];
  /** Table to look the name up in. */
  table: string;
  /** Columns in that table to match against, case-insensitively. */
  matchColumns: string[];
  /** Shown in the error when nothing matches. */
  label: string;
};

/** Every dataset that hangs off a vehicle class accepts its name or slug. */
const vehicleClassRef: BulkRefSpec = {
  idField: "vehicle_class_id",
  textFields: ["vehicle_class", "vehicle_class_name", "vehicle_class_slug"],
  table: "vehicle_classes",
  matchColumns: ["name", "slug"],
  label: "vehicle class",
};

const vehicleClassRefFields: BulkField[] = [{ name: "vehicle_class", type: "string" }];

export type BulkEntity = {
  key: string;
  label: string;
  table: string;
  /** Natural key used to update existing rows when no id is supplied. */
  naturalKey?: string;
  orderBy: string;
  fields: BulkField[];
  /** Boolean columns that can be flipped for a selection of rows. */
  flags?: { name: string; label: string }[];
  /** Whether selected rows may be deleted in bulk. */
  deletable?: boolean;
  /** Place ID columns the importer fills in automatically from address text. */
  geo?: BulkGeoSpec[];
  /** Uuid columns the importer fills in from a name or slug in the file. */
  refs?: BulkRefSpec[];
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
    flags: [{ name: "active", label: "Active" }],
    deletable: true,
    label: "Route Pricing (fixed routes)",
    table: "pricing_rules",
    orderBy: "priority",
    geo: [
      { placeId: "from_place_id", text: ["from_place_label", "from_address"], label: "from_place_label", lat: "from_lat", lng: "from_lng" },
      { placeId: "to_place_id", text: ["to_place_label", "to_address"], label: "to_place_label", lat: "to_lat", lng: "to_lng" },
    ],
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
    flags: [{ name: "active", label: "Active" }],
    deletable: true,
    label: "Location Pricing (zones)",
    table: "location_pricing_rules",
    naturalKey: "name",
    orderBy: "priority",
    geo: [{ placeId: "place_id", text: ["place_label", "name"], label: "place_label", lat: "lat", lng: "lng" }],
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
    flags: [{ name: "active", label: "Active" }],
    deletable: true,
    label: "Pricing Modifiers (surge / uplift / discount)",
    table: "pricing_modifiers",
    naturalKey: "name",
    orderBy: "priority",
    geo: [{ placeId: "place_id", text: ["place_label"], label: "place_label", lat: "lat", lng: "lng" }],
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
    flags: [{ name: "active", label: "Active" }],
    deletable: true,
    label: "Availability Rules (block / allow)",
    table: "availability_rules",
    naturalKey: "name",
    orderBy: "priority",
    geo: [{ placeId: "place_id", text: ["place_label"], label: "place_label", lat: "lat", lng: "lng" }],
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
    flags: [{ name: "active", label: "Active" }],
    deletable: true,
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
    key: "coupons",
    flags: [{ name: "active", label: "Active" }],
    deletable: true,
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
  {
    key: "seo_locations",
    label: "SEO Locations",
    table: "seo_locations",
    naturalKey: "slug",
    orderBy: "display_priority",
    geo: [{ placeId: "google_place_id", text: ["name"], context: ["region", "county", "nation"], lat: "latitude", lng: "longitude" }],
    flags: [{ name: "published", label: "Published" }, { name: "featured", label: "Featured" }],
    deletable: true,
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "slug", type: "string", required: true },
      { name: "location_type", type: "string", required: true },
      { name: "country_code", type: "string" },
      { name: "nation", type: "string" },
      { name: "region", type: "string" },
      { name: "county", type: "string" },
      { name: "admin_area_1", type: "string" },
      { name: "admin_area_2", type: "string" },
      { name: "postcode_area", type: "string" },
      { name: "google_place_id", type: "string" },
      { name: "latitude", type: "number" },
      { name: "longitude", type: "number" },
      { name: "operational_status", type: "string" },
      { name: "service_area_status", type: "string" },
      { name: "display_priority", type: "number" },
      { name: "featured", type: "boolean" },
      { name: "published", type: "boolean" },
    ],
  },
  {
    key: "seo_airports",
    label: "SEO Airports",
    table: "seo_airports",
    naturalKey: "slug",
    orderBy: "display_priority",
    geo: [{ placeId: "google_place_id", text: ["name"], context: ["iata_code"], lat: "latitude", lng: "longitude" }],
    flags: [{ name: "published", label: "Published" }, { name: "featured", label: "Featured" }],
    deletable: true,
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "slug", type: "string", required: true },
      { name: "iata_code", type: "string" },
      { name: "icao_code", type: "string" },
      { name: "google_place_id", type: "string" },
      { name: "latitude", type: "number" },
      { name: "longitude", type: "number" },
      { name: "terminal_information", type: "string" },
      { name: "pickup_instructions", type: "string" },
      { name: "dropoff_guidance", type: "string" },
      { name: "parking_information", type: "string" },
      { name: "waiting_time_policy", type: "string" },
      { name: "hero_image_url", type: "string" },
      { name: "display_priority", type: "number" },
      { name: "flight_tracking_available", type: "boolean" },
      { name: "featured", type: "boolean" },
      { name: "published", type: "boolean" },
    ],
  },
  {
    key: "seo_services",
    label: "SEO Services",
    table: "seo_services",
    naturalKey: "slug",
    orderBy: "display_priority",
    flags: [{ name: "published", label: "Published" }],
    deletable: true,
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "slug", type: "string", required: true },
      { name: "short_description", type: "string" },
      { name: "full_description", type: "string" },
      { name: "eligibility", type: "string" },
      { name: "fleet_categories", type: "strings" },
      { name: "hero_image_url", type: "string" },
      { name: "legacy_route_path", type: "string" },
      { name: "display_priority", type: "number" },
      { name: "published", type: "boolean" },
    ],
  },
  {
    key: "seo_popular_routes",
    label: "SEO Popular Routes",
    table: "seo_popular_routes",
    naturalKey: "slug",
    orderBy: "display_priority",
    flags: [{ name: "published", label: "Published" }, { name: "featured", label: "Featured" }, { name: "bidirectional", label: "Bidirectional" }],
    deletable: true,
    fields: [
      { name: "id", type: "string" },
      { name: "slug", type: "string", required: true },
      { name: "origin_entity_type", type: "string", required: true },
      { name: "origin_entity_id", type: "string", required: true },
      { name: "origin_place_id", type: "string", required: true },
      { name: "destination_entity_type", type: "string", required: true },
      { name: "destination_entity_id", type: "string", required: true },
      { name: "destination_place_id", type: "string", required: true },
      { name: "operational_status", type: "string" },
      { name: "route_notes", type: "string" },
      { name: "seasonal_notes", type: "string" },
      { name: "display_priority", type: "number" },
      { name: "bidirectional", type: "boolean" },
      { name: "featured", type: "boolean" },
      { name: "published", type: "boolean" },
    ],
  },
  {
    key: "points_of_interest",
    label: "Places / Points of interest",
    table: "points_of_interest",
    naturalKey: "slug",
    orderBy: "admin_priority",
    geo: [{ placeId: "place_id", text: ["address_label", "name"], context: ["name"], label: "address_label", lat: "latitude", lng: "longitude" }],
    flags: [{ name: "active", label: "Active" }, { name: "featured", label: "Featured" }],
    deletable: true,
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "slug", type: "string", required: true },
      { name: "category", type: "string" },
      { name: "place_id", type: "string" },
      { name: "address_label", type: "string" },
      { name: "short_description", type: "string" },
      { name: "opening_hours_note", type: "string" },
      { name: "admission_note", type: "string" },
      { name: "image_url", type: "string" },
      { name: "latitude", type: "number" },
      { name: "longitude", type: "number" },
      { name: "minimum_visit_minutes", type: "number" },
      { name: "recommended_visit_minutes", type: "number" },
      { name: "maximum_visit_minutes", type: "number" },
      { name: "stop_fee_pence", type: "number" },
      { name: "parking_fee_pence", type: "number" },
      { name: "scenic_score", type: "number" },
      { name: "admin_priority", type: "number" },
      { name: "featured", type: "boolean" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "scenic_route_templates",
    label: "Tour / Scenic route templates",
    table: "scenic_route_templates",
    naturalKey: "slug",
    orderBy: "display_order",
    geo: [
      { placeId: "origin_place_id", text: ["origin_label"], label: "origin_label" },
      { placeId: "destination_place_id", text: ["destination_label"], label: "destination_label" },
    ],
    flags: [{ name: "active", label: "Active" }, { name: "published", label: "Published" }, { name: "featured", label: "Featured" }],
    deletable: true,
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "slug", type: "string", required: true },
      { name: "theme", type: "string" },
      { name: "service_type", type: "string" },
      { name: "origin_label", type: "string" },
      { name: "origin_place_id", type: "string" },
      { name: "destination_label", type: "string" },
      { name: "destination_place_id", type: "string" },
      { name: "short_description", type: "string" },
      { name: "description", type: "string" },
      { name: "seasonal_note", type: "string" },
      { name: "hero_image_url", type: "string" },
      { name: "recommended_start_time", type: "time" },
      { name: "recommended_vehicle_categories", type: "strings" },
      { name: "tour_fee_pence", type: "number" },
      { name: "display_order", type: "number" },
      { name: "long_day", type: "boolean" },
      { name: "bidirectional", type: "boolean" },
      { name: "optimisation_allowed", type: "boolean" },
      { name: "featured", type: "boolean" },
      { name: "published", type: "boolean" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "extras",
    label: "Extras / Add-ons",
    table: "extras",
    naturalKey: "key",
    orderBy: "sort_order",
    flags: [{ name: "active", label: "Active" }, { name: "applies_to_all_classes", label: "All vehicle classes" }],
    deletable: true,
    fields: [
      { name: "id", type: "string" },
      { name: "key", type: "string", required: true },
      { name: "name", type: "string", required: true },
      { name: "description", type: "string" },
      { name: "price_pence", type: "number", required: true },
      { name: "price_basis", type: "string" },
      { name: "max_quantity", type: "number" },
      { name: "sort_order", type: "number" },
      { name: "applies_to_all_classes", type: "boolean" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "destinations",
    label: "Destinations (locations directory)",
    table: "destinations",
    naturalKey: "slug",
    orderBy: "seo_tier",
    geo: [{ placeId: "place_id", text: ["name"], context: ["town", "region", "country"], lat: "lat", lng: "lng" }],
    flags: [{ name: "active", label: "Active" }, { name: "noindex", label: "No-index" }],
    deletable: true,
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "slug", type: "string", required: true },
      { name: "display_name", type: "string" },
      { name: "short_name", type: "string" },
      { name: "type", type: "string", required: true },
      { name: "country", type: "string" },
      { name: "region", type: "string" },
      { name: "council", type: "string" },
      { name: "town", type: "string" },
      { name: "place_id", type: "string" },
      { name: "lat", type: "number" },
      { name: "lng", type: "number" },
      { name: "keywords", type: "strings" },
      { name: "synonyms", type: "strings" },
      { name: "seo_tier", type: "number" },
      { name: "noindex", type: "boolean" },
      { name: "active", type: "boolean" },
    ],
  },
  {
    key: "discount_rules",
    label: "Discounts (area / event)",
    table: "discount_rules",
    naturalKey: "name",
    orderBy: "priority",
    flags: [{ name: "active", label: "Active" }, { name: "stackable", label: "Stackable" }],
    deletable: true,
    geo: [{ placeId: "place_id", text: ["place_label", "name"], label: "place_label", lat: "lat", lng: "lng" }],
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", required: true },
      { name: "basis", type: "string" },
      { name: "discount_type", type: "string" },
      { name: "value", type: "number", required: true },
      { name: "event_name", type: "string" },
      { name: "place_id", type: "string" },
      { name: "place_label", type: "string" },
      { name: "lat", type: "number" },
      { name: "lng", type: "number" },
      { name: "radius_miles", type: "number" },
      { name: "scope", type: "string" },
      { name: "starts_at", type: "timestamp" },
      { name: "ends_at", type: "timestamp" },
      { name: "service_types", type: "strings" },
      { name: "vehicle_class_ids", type: "strings" },
      { name: "max_discount", type: "number" },
      { name: "stackable", type: "boolean" },
      { name: "priority", type: "number" },
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

// Shapes returned by the Spring Boot API (see backend CarDtos / InquiryDtos).

export type FuelType =
  | "PETROL"
  | "DIESEL"
  | "HYBRID"
  | "PLUGIN_HYBRID"
  | "RANGE_EXTENDER"
  | "ELECTRIC"
  | "LPG"
  | "OTHER";
export type Drivetrain = "FWD" | "RWD" | "AWD";

/**
 * Car extras: one per mobile.bg checkbox (backend CarFeature, same names and order).
 * Labels and groups are in format.ts.
 */
export type CarFeature =
  | "GPS_TRACKING"
  | "ADAPTIVE_HEADLIGHTS"
  | "ABS"
  | "AIRBAGS_REAR"
  | "AIRBAGS_FRONT"
  | "AIRBAGS_SIDE"
  | "EBD"
  | "ESP"
  | "TIRE_PRESSURE_MONITORING"
  | "PARKING_SENSORS"
  | "ISOFIX"
  | "DYNAMIC_STABILITY"
  | "TRACTION_CONTROL"
  | "DISTANCE_CONTROL"
  | "HILL_DESCENT_CONTROL"
  | "CAMERA"
  | "CARPLAY_ANDROID_AUTO"
  | "START_STOP"
  | "BLUETOOTH"
  | "DVD_TV"
  | "HEAD_UP_DISPLAY"
  | "MANUAL_SHIFT_MODE"
  | "USB_AUX"
  | "POWER_TAILGATE"
  | "AIR_SUSPENSION"
  | "KEYLESS_START"
  | "DIFFERENTIAL_LOCK"
  | "TRIP_COMPUTER"
  | "LOW_RANGE"
  | "VENTILATED_SEATS"
  | "LIGHT_SENSOR"
  | "POWER_MIRRORS"
  | "POWER_WINDOWS"
  | "POWER_SEATS"
  | "ELECTRIC_POWER_STEERING"
  | "AIR_CONDITIONING"
  | "CLIMATE_CONTROL"
  | "MULTIFUNCTION_STEERING_WHEEL"
  | "NAVIGATION"
  | "HEATED_STEERING_WHEEL"
  | "HEATER"
  | "HEATED_WINDSHIELD"
  | "HEATED_SEATS"
  | "STEERING_WHEEL_ADJUSTMENT"
  | "RAIN_SENSOR"
  | "POWER_STEERING"
  | "HEADLIGHT_WASHERS"
  | "CRUISE_CONTROL"
  | "HEAT_PUMP"
  | "COOLED_GLOVEBOX"
  | "FOUR_BY_FOUR"
  | "SEVEN_SEATS"
  | "BUY_BACK"
  | "BARTER"
  | "LPG"
  | "LONG_WHEELBASE"
  | "RESERVED_OR_SOLD"
  | "CRASHED"
  | "SHORT_WHEELBASE"
  | "LEASING"
  | "CNG"
  | "FOR_PARTS"
  | "FULLY_SERVICED"
  | "NEW_IMPORT"
  | "REGISTERED"
  | "SERVICE_BOOK"
  | "TUNING"
  | "DOORS_2_3"
  | "DOORS_4_5"
  | "LED_HEADLIGHTS"
  | "XENON_HEADLIGHTS"
  | "ALLOY_WHEELS"
  | "METALLIC_PAINT"
  | "PANORAMIC_ROOF"
  | "ROOF_RAILS"
  | "SPOILERS"
  | "TOW_BAR"
  | "HALOGEN_HEADLIGHTS"
  | "SUNROOF"
  | "OFFROAD_PACKAGE"
  | "ALARM"
  | "ARMORED"
  | "CASCO"
  | "WINCH"
  | "CENTRAL_LOCKING"
  | "VELOUR_INTERIOR"
  | "RIGHT_HAND_DRIVE"
  | "LEATHER_INTERIOR"
  | "LIGHT_INTERIOR"
  | "TAXI"
  | "DISABLED_ACCESS"
  | "HEARSE"
  | "AMBULANCE"
  | "DRIVING_SCHOOL"
  | "REFRIGERATED"
  | "N1_HOMOLOGATION";
export type Transmission = "AUTOMATIC" | "MANUAL";
export type Origin = "KR" | "CN";
/** REMOVED: the listing disappeared from the source (automatic import); hidden, deleted after 30 days. */
export type CarStatus = "DRAFT" | "PUBLISHED" | "RESERVED" | "SOLD" | "ARCHIVED" | "REMOVED";
export type CarSource = "AUTOHOME" | "AUTOWINI" | "GUAZI" | "OTHER" | "MANUAL";

/** The admin list's counts (backend AdminCarCounts): cars matching the search and source, in all and per status. */
export interface AdminCarCounts {
  total: number;
  byStatus: Partial<Record<CarStatus, number>>;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface CarSummary {
  id: number;
  slug: string;
  title: string;
  make: string | null;
  model: string | null;
  year: number | null;
  mileageKm: number | null;
  fuelType: FuelType | null;
  transmission: Transmission | null;
  powerHp: number | null;
  batteryKwh: number | null;
  electricRangeKm: number | null;
  origin: Origin | null;
  status: CarStatus;
  totalPriceEur: number | null;
  coverImageUrl: string | null;
  /** the first photos in order, cover first (the card swipes through them) */
  imageUrls: string[];
}

/** A row of the admin car list (backend AdminCarSummary): where the car was imported from, too. */
export interface AdminCarSummary {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  mileageKm: number | null;
  status: CarStatus;
  totalPriceEur: number | null;
  coverImageUrl: string | null;
  source: CarSource;
  sourceRef: string | null;
  sourceUrl: string | null;
}

/** Public description of a car (backend CarSpecs). */
export interface CarSpecs {
  title: string;
  make: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  /** "YYYY-MM" when known */
  firstRegistration: string | null;
  mileageKm: number | null;
  fuelType: FuelType | null;
  transmission: Transmission | null;
  drivetrain: Drivetrain | null;
  engineCc: number | null;
  engine: string | null;
  powerHp: number | null;
  batteryKwh: number | null;
  electricRangeKm: number | null;
  /** CLTC, NEDC, WLTP, EPA ... */
  rangeStandard: string | null;
  motorPowerKw: number | null;
  /** Traction battery state of health (SOH), percent; from guazi's battery report */
  batteryHealthPct: number | null;
  /** Euro emission class 1-6 (China VI counts as 6) */
  euroStandard: number | null;
  bodyType: string | null;
  seats: number | null;
  doors: number | null;
  color: string | null;
  curbWeightKg: number | null;
  dimensions: string | null;
  description: string | null;
  extraSpecs: Record<string, string>;
  /** extras in the mobile.bg form's order */
  features: CarFeature[];
  /**
   * The source site's full specification sheet as imported (English; the car page translates it). Read-only: the
   * admin editor does not send it, and saving a car keeps the stored one.
   */
  sheet?: SpecGroup[];
  /** The source's inspection report as imported (guazi; English, the car page translates it). Read-only. */
  inspection?: Inspection | null;
}

/** The source's inspection report (backend Inspection). */
export interface Inspection {
  /** guazi's condition grade: S, A, B, C, D */
  grade: string | null;
  /** "No Accident Damage" ...; passed = the car is free of it */
  checks: { title: string; passed: boolean }[];
  /** every checked area: points without and with remarks */
  categories: { name: string; normal: number; abnormal: number }[];
  /** the points with a defect, with the inspector's note and video */
  findings: {
    category: string | null;
    item: string | null;
    result: string | null;
    note: string | null;
    imageUrl: string | null;
    videoUrl: string | null;
  }[];
}

/** A group of the source's specification sheet (backend SpecGroup); value "" = fitted, nothing more to say. */
export interface SpecGroup {
  name: string;
  items: { name: string; value: string }[];
}

/** Price formula of a source site (backend PriceProfile). */
export type PriceProfile = "AUTOHOME" | "AUTOWINI";

/** Admin-only price inputs (backend PricingInputs). */
export interface PricingInputs {
  sourcePrice: number | null;
  sourceCurrency: string | null;
  /** null = the formula of the car's source site */
  profile: PriceProfile | null;
  /** profit for this car instead of the formula's; null = the formula's */
  profitEur: number | null;
  /** final price set by hand, replacing the calculation; null = calculated */
  fixedTotalEur: number | null;
}

/**
 * One site's price formula (backend PricingProfile), EUR, on the FOB price:
 * final = FOB + seaFreight + landTransport + commission + dutyVatPct % × (FOB + seaFreight)
 *         + max(profitMin, profitPct % × FOB).
 */
export interface PricingProfile {
  id: PriceProfile;
  seaFreight: number;
  landTransport: number;
  commission: number;
  /** duty and VAT, percent of FOB + sea freight (20 = 20 %); unused when the formula has a table */
  dutyVatPct: number;
  /** duty and VAT by FOB (autowini), ascending, the open row last; empty = the percent */
  dutyBrackets: DutyBracket[];
  /** our markup: markupLow up to markupThreshold FOB (inclusive), markupHigh above */
  markupLow: number;
  markupHigh: number;
  markupThreshold: number;
  updatedAt: string;
}

/** A row of a duty and VAT table: dutyVat for a FOB up to fobUpTo (inclusive); fobUpTo null = above all rows. */
export interface DutyBracket {
  fobUpTo: number | null;
  dutyVat: number;
}

export interface CarDetail {
  id: number;
  slug: string;
  status: CarStatus;
  origin: Origin | null;
  specs: CarSpecs;
  imageUrls: string[];
  /** final price with everything included; the only price customers see */
  priceEur: number | null;
}

export interface FilterOptions {
  makes: string[];
  /** make -> the models of the public cars of that make */
  models: Record<string, string[]>;
  fuelTypes: FuelType[];
  transmissions: Transmission[];
  origins: Origin[];
}

/** The exchange rates the prices use (backend EcbExchangeRateProvider.Rates): EUR per 1 unit of each currency. */
export interface ExchangeRates {
  /** "ECB" = the ECB daily reference rates of `date`; "CONFIG" = the configured fallback (ECB not reached yet) */
  source: "ECB" | "CONFIG";
  date: string | null;
  eurPerUnit: Record<string, number>;
}

/** How the final price was built. The calculated parts are null when the price was set by hand without a source price. */
export interface PriceBreakdown {
  profile: PriceProfile | null;
  sourcePrice: number | null;
  sourceCurrency: string | null;
  /** the FOB price in EUR */
  carPriceEur: number | null;
  seaFreightEur?: number | null;
  landTransportEur?: number | null;
  commissionEur?: number | null;
  dutyVatPct?: number | null;
  dutyVatEur?: number | null;
  /** old formula (prices calculated before October 2026, until recalculated) */
  baseCostsEur?: number | null;
  steps?: number | null;
  stepCostsEur?: number | null;
  profitEur: number | null;
  profitOverridden: boolean;
  /** the formula's profit percent and minimum (null when overridden or calculated before the change) */
  profitPct?: number | null;
  profitMinEur?: number | null;
  /** what the formula gives; null when it cannot be calculated */
  calculatedTotalEur: number | null;
  totalEur: number;
  /** totalEur was set by hand */
  fixedTotal: boolean;
  /** the exchange rate the price was calculated with: EUR per 1 unit of sourceCurrency (null when not calculated) */
  eurPerUnit?: number | null;
  /** duty and VAT came from the formula's table, and its row ("FOB up to"; null = above all rows) */
  dutyVatTable?: boolean | null;
  dutyVatFobUpToEur?: number | null;
  /** the step of 31.10.2026 (autowini, until recalculated): stepBaseEur + stepPct % of the FOB above stepFromEur */
  stepEur?: number | null;
  stepBaseEur?: number | null;
  stepFromEur?: number | null;
  stepPct?: number | null;
  /** the markup's threshold FOB (null when the markup was set for the car, or before the change) */
  markupLowEur?: number | null;
  markupHighEur?: number | null;
  markupThresholdEur?: number | null;
}

export interface AdminImage {
  id: number;
  /** where the browser shows it from: our /media, or the source site's CDN when linked */
  url: string;
  sourceUrl: string | null;
  position: number;
  /** shown straight from the source site (guazi, autohome), not stored by us */
  linked: boolean;
  /** the photo from our own origin, stored or linked alike: downloads and the mobile.bg extension */
  fileUrl: string;
}

export interface AdminCar {
  id: number;
  slug: string;
  status: CarStatus;
  source: CarSource;
  sourceUrl: string | null;
  sourceRef: string | null;
  sourceLocation: string | null;
  specs: CarSpecs;
  pricing: PricingInputs;
  price: PriceBreakdown | null;
  images: AdminImage[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ImportResult {
  car: AdminCar;
  alreadyImported: boolean;
  importedImages: number;
  warnings: string[];
}

export type InquiryStatus = "NEW" | "CONTACTED" | "CLOSED";

export interface AdminInquiry {
  id: number;
  carId: number | null;
  carTitle: string | null;
  carSlug: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  status: InquiryStatus;
  createdAt: string;
  heardFrom: HeardFrom | null;
  attribution: Attribution;
}

/** "Откъде научихте за нас?" (backend HeardFrom); labels in format.ts. */
export type HeardFrom =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "GOOGLE"
  | "MOBILE_BG"
  | "VIBER"
  | "TIKTOK"
  | "YOUTUBE"
  | "FRIEND"
  | "RETURNING"
  | "OTHER";

/** How a visitor reached the site (backend Attribution): the first page of the visit, kept until they write. */
export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  landingPath: string | null;
  referrer: string | null;
}

/** Inquiries per key (backend InquiryDtos.Count); key null = not answered / none. */
export interface ReportCount {
  key: string | null;
  count: number;
}

/** The admin report (backend InquiryReport); dates yyyy-MM-dd, Sofia days. */
export interface InquiryReport {
  from: string;
  to: string;
  total: number;
  byStatus: ReportCount[];
  byHeardFrom: ReportCount[];
  byUtmSource: ReportCount[];
  byUtmCampaign: ReportCount[];
  byCar: { carId: number | null; carTitle: string | null; carSlug: string | null; count: number }[];
  byWeek: { weekStart: string; count: number }[];
}

/** "Доставени коли" on the site (backend PublicDeliveredCar). carSlug only while the car is in the catalog. */
export interface PublicDeliveredCar {
  id: number;
  carTitle: string;
  customerName: string;
  city: string | null;
  quote: string | null;
  deliveredOn: string | null;
  photoUrl: string | null;
  carSlug: string | null;
}

/** Backend AdminDeliveredCar. */
export interface AdminDeliveredCar {
  id: number;
  carId: number | null;
  carSlug: string | null;
  carTitle: string;
  customerName: string;
  city: string | null;
  quote: string | null;
  deliveredOn: string | null;
  photoUrl: string | null;
  consent: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Backend DeliveredCarRequest. */
export interface DeliveredCarRequest {
  carId: number | null;
  carTitle: string;
  customerName: string;
  city: string;
  quote: string;
  deliveredOn: string | null;
  consent: boolean;
  published: boolean;
}

export type SocialNetwork = "FACEBOOK" | "INSTAGRAM" | "VIBER";

/** A car published to Facebook/Instagram/Viber from the admin panel (backend SocialPost). */
export interface SocialPost {
  id: number;
  carId: number;
  network: SocialNetwork;
  externalId: string;
  permalink: string | null;
  photos: number;
  createdAt: string;
}

export type ScheduledPostStatus = "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "CANCELLED";

/** A post planned for later (backend ScheduledPost); the backend publishes it at publishAt. */
export interface ScheduledPost {
  id: number;
  carId: number;
  carTitle: string;
  network: SocialNetwork;
  body: string;
  /** photos in posting order; empty = the first ones of the gallery */
  imageIds: number[];
  publishAt: string;
  status: ScheduledPostStatus;
  attempts: number;
  /** why it failed (FAILED) */
  error: string | null;
  socialPostId: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The logged-in admin (backend AdminAuthController.Me). */
export interface AdminMe {
  username: string;
  /** logged in with a one-time password: must choose an own one before anything else */
  mustChangePassword: boolean;
}

/** An admin user (backend AdminUserController.AdminUserView). */
export interface AdminUser {
  id: number;
  username: string;
  createdAt: string;
  lastLoginAt: string | null;
  passwordChangedAt: string;
  mustChangePassword: boolean;
  locked: boolean;
  /** the logged-in admin */
  you: boolean;
}

/** A new or reset admin with the one-time password to hand over (shown once). */
export interface OneTimePassword {
  user: AdminUser;
  oneTimePassword: string;
}

/** Which networks the backend can publish to (backend SocialPublisher.Status). */
export interface SocialStatus {
  facebook: boolean;
  instagram: boolean;
  viber: boolean;
}

/** A post text template saved in the admin panel (backend PostTemplate): FACEBOOK is shared with Instagram. */
export interface PostTemplate {
  network: SocialNetwork | "MOBILE_BG";
  body: string;
  updatedAt: string;
}

/** Business details shared by all post templates (backend PostSettings); null = the default from site.ts. */
export interface PostSettings {
  phone: string | null;
  viberLink: string | null;
  office: string | null;
  /** The Meta Pixel the site loads after the visitor accepts marketing cookies; null = none. */
  metaPixelId: string | null;
}

export interface ViberConnectResponse {
  callbackUrl: string;
}

/** One publication to several networks with the same photos (backend AdminSocialController.PublishRequest). */
export interface PublishRequest {
  posts: { network: SocialNetwork; text: string }[];
  imageIds: number[];
  /** ISO instant; absent = now */
  publishAt?: string;
}

/** mobile.bg's "Добави обява" form filled in from a car, in mobile.bg's values (backend MobileBgDraft). */
export interface MobileBgDraft {
  brand: string | null;
  model: string | null;
  modification: string | null;
  engineType: string | null;
  /** "0" used, "1" new, "3" damaged, "2" for parts */
  condition: string | null;
  powerHp: number | null;
  euroStandard: number | null;
  gearbox: string | null;
  category: string | null;
  engineCc: number | null;
  price: number | null;
  /** "1" private/exempt, "2" with VAT, "3" without VAT */
  vat: string | null;
  currency: string | null;
  mileageKm: number | null;
  /** "януари" … "декември" */
  month: string | null;
  year: number | null;
  color: string | null;
  region: string | null;
  city: string | null;
  rangeKm: number | null;
  batteryKwh: number | null;
  extras: CarFeature[];
}

export type MobileBgWarningCode =
  | "CATALOG_MISSING"
  | "BRAND_NOT_FOUND"
  | "MODEL_NOT_FOUND"
  | "RANGE_EXTENDER"
  | "CATEGORY_UNKNOWN"
  | "COLOR_UNKNOWN"
  | "RANGE_NOT_WLTP"
  | "PRODUCTION_MONTH_UNKNOWN"
  | "NO_PRICE";

/** Where a car was posted on mobile.bg (backend MobileBgListing). */
export interface MobileBgListing {
  carId: number;
  listingId: string | null;
  url: string | null;
  publishedAt: string;
  publishedBy: string | null;
}

/** GET /api/admin/cars/{id}/mobile-bg */
export interface MobileBgForm {
  draft: MobileBgDraft;
  warnings: { code: MobileBgWarningCode; value: string | null }[];
  /** every extra's checkbox value in mobile.bg */
  extraValues: Record<CarFeature, string>;
  listing: MobileBgListing | null;
  catalogCapturedAt: string | null;
}

/** mobile.bg's lists, as the browser extension read them from the form (backend MobileBgCatalog). */
export interface MobileBgCatalog {
  brands: { name: string; models: string[] }[];
  /** by mobile.bg field name, e.g. f17 = colours */
  selects: Record<string, { value: string; text: string }[]>;
  extras: { field: string; value: string }[];
  capturedAt: string | null;
}

// ---------------------------------------------------------------- automatic import (backend AutoImportDtos)

export type AutoImportSource = "AUTOWINI" | "GUAZI";

/** autowini: inspected + actual mileage; guazi: condition grades. Each site ignores the other's. */
export interface AutoImportFilters {
  inspected: boolean;
  actualMileage: boolean;
  grades: string[];
}

export interface AutoImportModel {
  code: string;
  name: string;
}

/** A make to import; models empty = all models. */
export interface AutoImportBrand {
  code: string;
  name: string;
  enabled: boolean;
  yearFrom: number;
  models: AutoImportModel[];
}

export interface AutoImportSourceView {
  source: AutoImportSource;
  enabled: boolean;
  filters: AutoImportFilters;
  brands: AutoImportBrand[];
  /** listings per state: QUEUED, IMPORTED, FAILED */
  queue: Record<string, number>;
}

export interface AutoImportBrandPass {
  code: string;
  name: string;
  expected: number;
  found: number;
  complete: boolean;
  error: string | null;
}

export type AutoImportRunStatus = "RUNNING" | "DONE" | "INCOMPLETE" | "STOPPED" | "FAILED";

export interface AutoImportRun {
  id: number;
  source: AutoImportSource;
  dryRun: boolean;
  status: AutoImportRunStatus;
  startedAt: string;
  finishedAt: string | null;
  found: number;
  newCount: number;
  goneCount: number;
  returnedCount: number;
  brands: AutoImportBrandPass[];
  message: string | null;
  /** cars added by hand (or of makes not imported) checked at the source, and of them hidden */
  manualChecked: number;
  manualGone: number;
}

/** Where a car was posted through the admin panel (backend PostedChannels.Post). */
export interface PostedChannel {
  network: "FACEBOOK" | "INSTAGRAM" | "VIBER" | "MOBILE_BG";
  url: string | null;
  at: string;
}

/** A car a run hid (backend AutoImportRunRepository.Removed). */
export interface AutoImportRemoved {
  id: number;
  carId: number | null;
  source: AutoImportSource;
  title: string | null;
  slug: string | null;
  sourceUrl: string | null;
  /** added by hand (or of a make not imported) */
  manual: boolean;
  posted: PostedChannel[];
  removedAt: string;
}

export interface AutoImportFailure {
  source: AutoImportSource;
  listingId: string;
  url: string;
  title: string | null;
  price: number | null;
  state: string;
  attempts: number;
  error: string | null;
  updatedAt: string;
}

/** The failures tab (backend AutoImportDtos.Failures). */
export interface AutoImportFailures {
  page: PageResponse<AutoImportFailure>;
  /** the failures grouped by reason (URLs as "…", numbers as "N"), most first */
  reasons: { reason: string; count: number }[];
}

/** A price recalculation started by hand (backend PriceRecalcRepository.Run). */
export interface PriceRecalcRun {
  id: number;
  /** "ALL" or a CarSource */
  scope: string;
  /** STORED: the FOB kept at the import; SOURCE: read again from each listing */
  mode: "STORED" | "SOURCE";
  status: "RUNNING" | "DONE" | "FAILED";
  startedBy: string | null;
  startedAt: string;
  finishedAt: string | null;
  total: number;
  processed: number;
  changed: number;
  /** cars with a final price set by hand: kept */
  fixedPrice: number;
  /** SOURCE: listings that could not be read (recalculated from the kept FOB) */
  failed: number;
  message: string | null;
}

export interface PriceRecalcItem {
  id: number;
  carId: number | null;
  kind: "CHANGED" | "FAILED";
  title: string | null;
  slug: string | null;
  carStatus: CarStatus | null;
  source: CarSource | null;
  sourceUrl: string | null;
  oldPriceEur: number | null;
  newPriceEur: number | null;
  oldSourcePrice: number | null;
  newSourcePrice: number | null;
  sourceCurrency: string | null;
  note: string | null;
  posted: PostedChannel[];
}

export interface AutoImportOverview {
  /** the main switch */
  enabled: boolean;
  /** the run going on now, e.g. "GUAZI (dry run)" */
  running: string | null;
  /** listings with more km are not imported (both sites); null = no limit */
  maxMileageKm: number | null;
  sources: AutoImportSourceView[];
  runs: AutoImportRun[];
}

export interface AutoImportCatalogEntry {
  code: string;
  name: string;
}

export interface AutoImportPreview {
  source: AutoImportSource;
  brands: { code: string; name: string; count: number | null; error: string | null }[];
  total: number;
  error: string | null;
}

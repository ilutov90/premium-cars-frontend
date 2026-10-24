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
export type CarStatus = "DRAFT" | "PUBLISHED" | "RESERVED" | "SOLD" | "ARCHIVED";
export type CarSource = "AUTOHOME" | "AUTOWINI" | "OTHER" | "MANUAL";

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

/** final price = car + baseCosts + stepCost × (car − threshold) / step + profit, all EUR; proportional above the threshold. */
export interface PricingProfile {
  id: PriceProfile;
  baseCosts: number;
  threshold: number;
  step: number;
  stepCost: number;
  profit: number;
  updatedAt: string;
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
  carPriceEur: number | null;
  baseCostsEur: number | null;
  steps: number | null;
  stepCostsEur: number | null;
  profitEur: number | null;
  profitOverridden: boolean;
  /** what the formula gives; null when it cannot be calculated */
  calculatedTotalEur: number | null;
  totalEur: number;
  /** totalEur was set by hand */
  fixedTotal: boolean;
  /** the exchange rate the price was calculated with: EUR per 1 unit of sourceCurrency (null when not calculated) */
  eurPerUnit?: number | null;
}

export interface AdminImage {
  id: number;
  url: string;
  sourceUrl: string | null;
  position: number;
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
  network: SocialNetwork;
  body: string;
  updatedAt: string;
}

/** Business details shared by all post templates (backend PostSettings); null = the default from site.ts. */
export interface PostSettings {
  phone: string | null;
  viberLink: string | null;
  office: string | null;
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

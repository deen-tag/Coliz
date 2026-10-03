// Formes des réponses du backend Coliz (les montants Prisma Decimal arrivent en string).
export type Money = string | number;

export type MeUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  identityVerified: boolean;
};

export type Traveler = {
  id?: string;
  firstName: string;
  avatarUrl: string | null;
  ratingAverage: number;
  ratingCount: number;
  identityVerified: boolean;
};

export type TripResult = {
  tripId: string;
  traveler: Traveler;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  mode: string;
  departureAt: string;
  arrivalAt: string | null;
  contributionAmount: Money;
  totalAmount: Money;
  remainingParcels: number;
};

export type SearchResponse = { trips: TripResult[]; total: number; hasMore: boolean };

export type TripDetail = {
  id: string;
  status: string;
  mode: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  pickupPointLabel: string | null;
  dropoffPointLabel: string | null;
  departureAt: string;
  arrivalAt: string | null;
  contributionAmount: Money;
  totalAmount: Money;
  remainingParcels: number;
  capacityWeightKg: number;
  capacityLengthCm: number;
  capacityWidthCm: number;
  capacityHeightCm: number;
  traveler: Traveler & { id: string };
};

export type MyTrip = {
  id: string;
  status: string;
  originLabel: string;
  destinationLabel: string;
  departureAt: string;
  mode: string;
  contributionAmount: Money;
  remainingParcels: number;
  capacityParcels: number;
  compatibleParcelsCount: number;
  pendingRequests: number;
};

export type MyParcel = {
  id: string;
  status: string;
  originLabel: string;
  destinationLabel: string;
  desiredDate: string;
  createdAt: string;
  booking: null | {
    id: string;
    status: string;
    totalAmount: Money;
    mode: string;
    departureAt: string;
    travelerFirstName: string;
    travelerVerified: boolean;
  };
};

export type BookingListItem = {
  id: string;
  status: string;
  totalAmount: Money;
  contributionAmount: Money;
  createdAt: string;
  role: "sender" | "traveler";
  counterpart: string;
  originLabel: string;
  destinationLabel: string;
  departureAt: string;
  mode: string;
};

export type BookingDetail = {
  id: string;
  status: string;
  senderId: string;
  travelerId: string;
  parcelId: string;
  tripId: string;
  contributionAmount: Money;
  platformFeeAmount: Money;
  totalAmount: Money;
  negotiatedAmount: Money | null;
  parcel: {
    originLabel: string;
    destinationLabel: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    weightKg: number;
    parcelCount: number;
    declaredValue: Money;
    photoUrl: string | null;
  };
  trip: {
    originLabel: string;
    destinationLabel: string;
    departureAt: string;
    arrivalAt: string | null;
    mode: string;
    pickupPointLabel: string | null;
    dropoffPointLabel: string | null;
  };
  traveler: { id: string; firstName: string; avatarUrl: string | null; ratingAverage: number; identityVerifiedAt: string | null };
  sender: { id: string; firstName: string; avatarUrl: string | null; identityVerifiedAt: string | null };
};

export type Conversation = {
  bookingId: string;
  otherUser: { id: string; firstName: string; avatarUrl: string | null };
  route: string;
  status: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; firstName: string; avatarUrl: string | null };
};

export type AppNotification = { id: string; type: string; content: string; readAt: string | null; createdAt: string };

export type Dashboard = { unreadNotifications: number; walletAvailable: Money };

export type SettingsData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  notifyEmail: boolean;
  notifyPush: boolean;
  language: string;
  verification: { email: boolean; phone: boolean; identity: boolean; isFullyVerified: boolean };
};

export type PublicProfile = {
  id: string;
  memberSince: string;
  completedTrips: number;
  firstName: string;
  avatarUrl: string | null;
  bio: string | null;
  ratingAverage: number;
  ratingCount: number;
  verification?: { email: boolean; phone: boolean; identity: boolean; isFullyVerified: boolean };
  upcomingTrips: { id: string; originLabel: string; destinationLabel: string; departureAt: string; mode: string; totalAmount: Money }[];
  reviews: { rating: number; comment: string | null; author: string; createdAt: string }[];
};

export type WalletData = {
  availableAmount: Money;
  pendingAmount: Money;
  transactions: { id: string; type: string; amount: Money; createdAt: string; status: string }[];
};

export type CityChoice = { label: string; lat: number; lng: number };

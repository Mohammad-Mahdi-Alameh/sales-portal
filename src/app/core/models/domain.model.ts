export type Role = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  account_type: 'staff' | 'client';
  role?: Role;
  enabled?: boolean;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  account_type?: 'client';
  enabled?: boolean;
  salesId?: string;
  orgId?: string | null;
  isOrgAdmin?: boolean;
  // decorated
  organizationCount?: number;
  venueCount?: number;
  salesName?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  orgId?: string;
  name: string;
  adminId: string;
  salesId?: string;
  status?: 'active' | 'inactive';
  isActive: boolean;
  country?: string;
  timezone?: string;
  currency?: string;
  billingEmail?: string;
  // decorated
  adminName?: string | null;
  salesName?: string | null;
  branchCount?: number;
  venueCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Branch {
  id: string;
  branchId?: string;
  orgId: string;
  name: string;
  active: boolean;
  city?: string;
  country?: string;
  // decorated
  orgName?: string | null;
  venueCount?: number;
  activeVenueCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type VenueStatus = 'Active' | 'Trial' | 'Inactive';
export type VenueType = 'restaurant' | 'club' | 'cafe' | 'bar' | string;

export interface Venue {
  id: string;
  name: string;
  owner: string;
  adminId?: string;
  orgId: string | null;
  branchId: string | null;
  salesId?: string;
  status: VenueStatus;
  type: VenueType;
  city?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  subscriptionTier?: string;
  renewalAt?: string;
  receiverEnabled?: boolean;
  qrEnabled?: boolean;
  offlineDevices?: number;
  // decorated
  orgName?: string | null;
  branchName?: string | null;
  ownerName?: string | null;
  salesName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  cards: {
    organizations: number;
    activeOrganizations: number;
    venues: number;
    activeVenues: number;
    trialVenues: number;
    renewalsDueSoon: number;
    offlineDevices: number;
  };
  renewalsDueSoon: Venue[];
  recentAudit: RecentActivity[];
  salesWorkload: SalesWorkload[];
  funnel: { label: string; value: number }[];
}

export interface RecentActivity {
  id: string;
  action: string;
  resource: string;
  staffName?: string;
  organizationName?: string | null;
  venueName?: string | null;
  timestamp: string;
}

export interface SalesWorkload {
  staffId: string;
  name: string;
  clients: number;
  venues: number;
  serials: number;
}

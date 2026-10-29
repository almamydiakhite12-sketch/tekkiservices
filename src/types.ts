export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  tagline: string;
  features: string[];
  duration_days: number;
  is_active: number;
  highlighted?: number;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: 'active' | 'suspended';
  current_plan_id: string | null;
  current_subscription_id: string | null;
  last_seen_at: string | null;
  last_login_at: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
  plan_name?: string;
  plan_price?: number;
  sub_status?: string;
  expires_date?: string;
  is_online?: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'suspended' | 'cancelled';
  auto_renew: number;
  start_date: string;
  expires_date: string;
  cancelled_at: string | null;
  last_payment_id: string | null;
  created_at: string;
  updated_at: string;
  plan_name?: string;
  plan_price?: number;
  user_name?: string;
  user_phone?: string;
  payment_method?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  plan_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  payment_method: 'wave' | 'orange_money';
  phone: string;
  recipient_phone: string;
  status: 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled' | 'refunded' | 'expired';
  provider_tx_id: string | null;
  provider_response: string | null;
  error_message: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  plan_name?: string;
  user_name?: string;
  user_phone?: string;
}

export interface Conversation {
  id: string;
  user_id: string | null;
  user_name: string;
  user_phone: string | null;
  user_email: string | null;
  subject: string | null;
  last_message_at: string;
  unread_admin_count: number;
  unread_user_count: number;
  created_at: string;
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string;
  sender_name: string;
  content: string;
  is_read: number;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  type: 'new_user' | 'payment_success' | 'payment_failed' | 'new_subscription' | 'subscription_expired' | 'new_message' | 'security_alert';
  title: string;
  message: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  result: 'success' | 'failed';
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    newToday: number;
  };
  subscriptions: {
    active: number;
    expired: number;
    suspended: number;
  };
  revenue: {
    total: number;
    today: number;
    week: number;
    month: number;
  };
  visitors: {
    total: number;
    today: number;
    week: number;
    month: number;
  };
}

export interface UserSite {
  id: string;
  user_id: string;
  template_id: 'ecommerce' | 'restaurant' | 'agency' | 'medical' | 'realestate';
  title: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  address: string | null;
  content_json: string;
  is_published: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_phone?: string;
  subscription_status?: string;
  subscription_expires_date?: string;
}

export interface SiteTemplate {
  id: 'ecommerce' | 'restaurant' | 'agency' | 'medical' | 'realestate';
  name: string;
  tagline: string;
  category: string;
  previewImage: string;
  color: string;
  features: string[];
  defaultContent: any;
}


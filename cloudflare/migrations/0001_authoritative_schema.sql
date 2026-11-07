-- Terrabar authoritative D1 schema baseline
-- Generated from live Supabase public schema metadata on 2026-11-07.
-- Existing inferred D1 tables are renamed, not dropped, and retained as rollback references.
PRAGMA foreign_keys = ON;

ALTER TABLE "admin_users" RENAME TO "_legacy_inferred_admin_users";
ALTER TABLE "load_images" RENAME TO "_legacy_inferred_load_images";
ALTER TABLE "load_price_tiers" RENAME TO "_legacy_inferred_load_price_tiers";
ALTER TABLE "loads" RENAME TO "_legacy_inferred_loads";
ALTER TABLE "member_roles" RENAME TO "_legacy_inferred_member_roles";
ALTER TABLE "members" RENAME TO "_legacy_inferred_members";
ALTER TABLE "orders" RENAME TO "_legacy_inferred_orders";
ALTER TABLE "purchase_requests" RENAME TO "_legacy_inferred_purchase_requests";
ALTER TABLE "rating_messages" RENAME TO "_legacy_inferred_rating_messages";
ALTER TABLE "ratings" RENAME TO "_legacy_inferred_ratings";
ALTER TABLE "sessions" RENAME TO "_legacy_inferred_sessions";
ALTER TABLE "site_visits" RENAME TO "_legacy_inferred_site_visits";
ALTER TABLE "users" RENAME TO "_legacy_inferred_users";

CREATE TABLE auth_users (id TEXT PRIMARY KEY, phone TEXT UNIQUE, email TEXT UNIQUE, phone_confirmed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, disabled_at TEXT);
CREATE TABLE auth_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_users(id), token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at TEXT);
CREATE INDEX idx_auth_sessions_user_expires ON auth_sessions(user_id, expires_at);
CREATE TABLE otp_challenges (id TEXT PRIMARY KEY, phone TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, consumed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_otp_phone_expiry ON otp_challenges(phone, expires_at);
CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE id_sequences (sequence_name TEXT PRIMARY KEY, current_value INTEGER NOT NULL DEFAULT 0);

CREATE TABLE "members" (
  "id" TEXT,
  "full_name" TEXT NOT NULL,
  "phone" TEXT,
  "city" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "products" TEXT,
  "verification_status" TEXT,
  "joined_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "auth_user_id" TEXT,
  "email" TEXT,
  "is_archived" INTEGER NOT NULL DEFAULT 0,
  "archived_at" TEXT,
  "archived_by" TEXT,
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("archived_by") REFERENCES "auth_users" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("target_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("reviewer_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("seller_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("buyer_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("buyer_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "loads" (
  "id" TEXT,
  "name" TEXT NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "city" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "product_type" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "engine" TEXT,
  "source_market" TEXT,
  "price" NUMERIC NOT NULL,
  "price_unit" TEXT NOT NULL,
  "quality" TEXT,
  "description" TEXT,
  "ready_date" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "member_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contact_phone" TEXT,
  "min_quantity" NUMERIC,
  "unit" TEXT NOT NULL,
  "owner_member_id" TEXT,
  "seller_type" TEXT,
  "source_region" TEXT,
  "sale_type" TEXT,
  "min_order_quantity" NUMERIC,
  "count" NUMERIC,
  "package_type" TEXT NOT NULL DEFAULT 'کارتن',
  "package_weight" NUMERIC NOT NULL DEFAULT 10,
  "ad_start_date" TEXT,
  "ad_end_date" TEXT,
  "response_start_time" TEXT,
  "response_end_time" TEXT,
  "archived_at" TEXT,
  "archived_by" TEXT,
  "archived_previous_status" TEXT,
  FOREIGN KEY ("load_id") REFERENCES "loads" ("id"),
  FOREIGN KEY ("target_load_id") REFERENCES "loads" ("id"),
  FOREIGN KEY ("archived_by") REFERENCES "auth_users" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("load_id") REFERENCES "loads" ("id"),
  FOREIGN KEY ("load_id") REFERENCES "loads" ("id"),
  FOREIGN KEY ("load_id") REFERENCES "loads" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
  "id" TEXT,
  "load_id" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT,
  "customer_city" TEXT NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "unit" TEXT NOT NULL,
  "price" NUMERIC,
  "total_price" NUMERIC,
  "delivery_address" TEXT,
  "delivery_type" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "buyer_member_id" TEXT,
  "seller_member_id" TEXT,
  "customer_email" TEXT,
  "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  "payment_provider" TEXT,
  "payment_reference" TEXT,
  "paid_at" TEXT,
  "delivery_status" TEXT NOT NULL DEFAULT 'awaiting_payment',
  "shipped_at" TEXT,
  "delivered_at" TEXT,
  "delivery_confirmation_method" TEXT,
  "delivery_confirmed_by" TEXT,
  "sale_type" TEXT NOT NULL DEFAULT 'regular',
  "invoice_number" INTEGER NOT NULL,
  FOREIGN KEY ("seller_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("buyer_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("load_id") REFERENCES "loads" ("id"),
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id"),
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id"),
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "social_connections" (
  "id" TEXT,
  "platform" TEXT NOT NULL,
  "account_name" TEXT,
  "account_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'disconnected',
  "connected_at" TEXT,
  "last_sync_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("connection_id") REFERENCES "social_connections" ("id"),
  FOREIGN KEY ("connection_id") REFERENCES "social_connections" ("id"),
  FOREIGN KEY ("connection_id") REFERENCES "social_connections" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "social_messages" (
  "id" TEXT,
  "connection_id" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "sender_name" TEXT,
  "sender_phone" TEXT,
  "sender_id" TEXT,
  "message_text" TEXT,
  "message_type" TEXT DEFAULT 'text',
  "external_message_id" TEXT,
  "received_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("connection_id") REFERENCES "social_connections" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "social_posts" (
  "id" TEXT,
  "connection_id" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "content" TEXT,
  "media_url" TEXT,
  "external_post_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "published_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("connection_id") REFERENCES "social_connections" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "social_contacts" (
  "id" TEXT,
  "platform" TEXT NOT NULL,
  "external_user_id" TEXT,
  "full_name" TEXT,
  "phone" TEXT,
  "username" TEXT,
  "city" TEXT,
  "role" TEXT,
  "member_id" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "webhook_events" (
  "id" TEXT,
  "platform" TEXT NOT NULL,
  "event_type" TEXT,
  "external_event_id" TEXT,
  "payload" TEXT,
  "processed" INTEGER NOT NULL DEFAULT 0,
  "received_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TEXT,
  PRIMARY KEY ("id")
);

CREATE TABLE "message_templates" (
  "id" TEXT,
  "platform" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT DEFAULT 'fa',
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE TABLE "outgoing_messages" (
  "id" TEXT,
  "connection_id" TEXT NOT NULL,
  "recipient_id" TEXT,
  "recipient_phone" TEXT,
  "message_text" TEXT,
  "message_type" TEXT DEFAULT 'text',
  "external_message_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "sent_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("connection_id") REFERENCES "social_connections" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "load_images" (
  "id" TEXT,
  "load_id" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("load_id") REFERENCES "loads" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "purchase_requests" (
  "id" TEXT,
  "buyer_member_id" TEXT,
  "product_type" TEXT NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "quantity_unit" TEXT NOT NULL DEFAULT 'kg',
  "destination_city" TEXT,
  "quality_requirements" TEXT,
  "needed_by" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "load_id" TEXT,
  "request_number" INTEGER NOT NULL,
  FOREIGN KEY ("buyer_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("load_id") REFERENCES "loads" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT,
  "actor_member_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "details" TEXT NOT NULL DEFAULT '{}',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE TABLE "load_price_tiers" (
  "id" TEXT,
  "load_id" TEXT NOT NULL,
  "min_quantity" NUMERIC NOT NULL DEFAULT 0,
  "max_quantity" NUMERIC,
  "unit_price" NUMERIC NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sale_type" TEXT NOT NULL DEFAULT 'regular',
  "minimum_packages" NUMERIC NOT NULL DEFAULT 1,
  FOREIGN KEY ("load_id") REFERENCES "loads" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "admin_users" (
  "id" TEXT,
  "auth_user_id" TEXT NOT NULL UNIQUE,
  "admin_role" TEXT NOT NULL,
  "city" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "login_username" TEXT,
  "display_name" TEXT,
  FOREIGN KEY ("admin_user_id") REFERENCES "admin_users" ("id"),
  FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id"),
  FOREIGN KEY ("auth_user_id") REFERENCES "auth_users" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "cities" (
  "city_name" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("neighbor_city_name") REFERENCES "cities" ("city_name"),
  FOREIGN KEY ("city_name") REFERENCES "cities" ("city_name"),
  FOREIGN KEY ("city_name") REFERENCES "cities" ("city_name"),
  PRIMARY KEY ("city_name")
);

CREATE TABLE "city_neighbors" (
  "city_name" TEXT,
  "neighbor_city_name" TEXT,
  "is_enabled" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("neighbor_city_name") REFERENCES "cities" ("city_name"),
  FOREIGN KEY ("city_name") REFERENCES "cities" ("city_name"),
  PRIMARY KEY ("city_name", "neighbor_city_name")
);

CREATE TABLE "admin_user_cities" (
  "admin_user_id" TEXT,
  "city_name" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("city_name") REFERENCES "cities" ("city_name"),
  FOREIGN KEY ("admin_user_id") REFERENCES "admin_users" ("id"),
  PRIMARY KEY ("admin_user_id", "city_name")
);

CREATE TABLE "member_roles" (
  "id" TEXT,
  "member_id" TEXT NOT NULL,
  "role_code" TEXT NOT NULL,
  "approval_status" TEXT NOT NULL DEFAULT 'pending',
  "approved_by" TEXT,
  "approved_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "request_note" TEXT,
  FOREIGN KEY ("approved_by") REFERENCES "auth_users" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "ratings" (
  "id" TEXT,
  "reviewer_member_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_member_id" TEXT,
  "target_load_id" TEXT,
  "score" INTEGER NOT NULL,
  "review_text" TEXT,
  "is_visible" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "order_id" TEXT NOT NULL,
  FOREIGN KEY ("rating_id") REFERENCES "ratings" ("id"),
  FOREIGN KEY ("reviewer_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("target_member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("target_load_id") REFERENCES "loads" ("id"),
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "site_visits" (
  "id" TEXT,
  "user_id" TEXT NOT NULL,
  "member_id" TEXT,
  "route" TEXT NOT NULL,
  "visited_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "seller_bank_accounts" (
  "id" TEXT,
  "member_id" TEXT NOT NULL UNIQUE,
  "bank_name" TEXT NOT NULL,
  "account_holder_name" TEXT NOT NULL,
  "iban" TEXT NOT NULL,
  "verification_status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("bank_account_id") REFERENCES "seller_bank_accounts" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "seller_financial_transactions" (
  "id" TEXT,
  "member_id" TEXT NOT NULL,
  "order_id" TEXT,
  "transaction_type" TEXT NOT NULL,
  "amount" NUMERIC NOT NULL,
  "description" TEXT NOT NULL,
  "reference_code" TEXT,
  "transaction_date" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payout_status" TEXT NOT NULL DEFAULT 'not_applicable',
  "processed_by" TEXT,
  "processed_at" TEXT,
  FOREIGN KEY ("transaction_id") REFERENCES "seller_financial_transactions" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "rating_messages" (
  "id" TEXT,
  "rating_id" TEXT NOT NULL,
  "sender_user_id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sender_user_id") REFERENCES "auth_users" ("id"),
  FOREIGN KEY ("rating_id") REFERENCES "ratings" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "admin_recovery_codes" (
  "id" TEXT,
  "auth_user_id" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TEXT NOT NULL,
  "used_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("auth_user_id") REFERENCES "auth_users" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "platform_financial_ledger" (
  "id" TEXT,
  "entry_type" TEXT NOT NULL,
  "entry_status" TEXT NOT NULL DEFAULT 'pending',
  "amount" NUMERIC NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IRR',
  "order_id" TEXT,
  "member_id" TEXT,
  "provider" TEXT,
  "external_reference" TEXT,
  "idempotency_key" TEXT UNIQUE,
  "description" TEXT NOT NULL DEFAULT '',
  "occurred_at" TEXT,
  "created_by" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id"),
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "seller_payout_requests" (
  "id" TEXT,
  "member_id" TEXT NOT NULL,
  "bank_account_id" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL UNIQUE,
  "amount" NUMERIC NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requested_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TEXT,
  "reviewed_by" TEXT,
  "admin_note" TEXT,
  "transfer_reference" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("bank_account_id") REFERENCES "seller_bank_accounts" ("id"),
  FOREIGN KEY ("transaction_id") REFERENCES "seller_financial_transactions" ("id"),
  FOREIGN KEY ("reviewed_by") REFERENCES "auth_users" ("id"),
  FOREIGN KEY ("member_id") REFERENCES "members" ("id"),
  PRIMARY KEY ("id")
);

CREATE TABLE "sms_hook_events" (
  "webhook_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provider_message_ids" TEXT,
  "error_code" TEXT,
  PRIMARY KEY ("webhook_id")
);

CREATE INDEX IF NOT EXISTS "idx_admin_user_cities_admin_city" ON "admin_user_cities" (admin_user_id, city_name);
CREATE INDEX IF NOT EXISTS "idx_admin_user_cities_city_name" ON "admin_user_cities" (city_name);
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_auth_user_id_key" ON "admin_users" (auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_login_username_unique" ON "admin_users" (lower(login_username)) WHERE (login_username IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_admin_users_created_by" ON "admin_users" (created_by);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs" (created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_city_neighbors_enabled_pair" ON "city_neighbors" (city_name, neighbor_city_name) WHERE (is_enabled = 1);
CREATE INDEX IF NOT EXISTS "idx_city_neighbors_enabled_reverse_pair" ON "city_neighbors" (neighbor_city_name, city_name) WHERE (is_enabled = 1);
CREATE INDEX IF NOT EXISTS "idx_city_neighbors_neighbor_city_name" ON "city_neighbors" (neighbor_city_name);
CREATE INDEX IF NOT EXISTS "idx_load_images_load" ON "load_images" (load_id);
CREATE INDEX IF NOT EXISTS "idx_load_price_tiers_load_id" ON "load_price_tiers" (load_id);
CREATE UNIQUE INDEX IF NOT EXISTS "load_price_tiers_load_sale_type_uidx" ON "load_price_tiers" (load_id, sale_type);
CREATE INDEX IF NOT EXISTS "idx_loads_active_created" ON "loads" (created_at DESC) WHERE (status = 'active');
CREATE INDEX IF NOT EXISTS "idx_loads_city" ON "loads" (city);
CREATE INDEX IF NOT EXISTS "idx_loads_city_product" ON "loads" (city, product_type);
CREATE INDEX IF NOT EXISTS "idx_loads_member_id" ON "loads" (member_id);
CREATE INDEX IF NOT EXISTS "idx_loads_owner" ON "loads" (owner_member_id);
CREATE INDEX IF NOT EXISTS "idx_loads_product" ON "loads" (product_type);
CREATE INDEX IF NOT EXISTS "idx_loads_status" ON "loads" (status);
CREATE INDEX IF NOT EXISTS "idx_member_roles_approved_by" ON "member_roles" (approved_by);
CREATE INDEX IF NOT EXISTS "idx_member_roles_member_approval_role" ON "member_roles" (member_id, approval_status, role_code);
CREATE UNIQUE INDEX IF NOT EXISTS "member_roles_member_id_role_code_key" ON "member_roles" (member_id, role_code);
CREATE INDEX IF NOT EXISTS "idx_members_phone" ON "members" (phone);
CREATE UNIQUE INDEX IF NOT EXISTS "members_auth_user_id_uidx" ON "members" (auth_user_id);
CREATE INDEX IF NOT EXISTS "idx_orders_buyer_created" ON "orders" (buyer_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_orders_buyer_member_id" ON "orders" (buyer_member_id);
CREATE INDEX IF NOT EXISTS "idx_orders_load_id" ON "orders" (load_id);
CREATE INDEX IF NOT EXISTS "idx_orders_seller_created" ON "orders" (seller_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_orders_seller_member_id" ON "orders" (seller_member_id);
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" (status);
CREATE INDEX IF NOT EXISTS "orders_delivery_status_created_idx" ON "orders" (delivery_status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_invoice_number_uidx" ON "orders" (invoice_number);
CREATE INDEX IF NOT EXISTS "orders_payment_status_created_idx" ON "orders" (payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_outgoing_messages_connection_id" ON "outgoing_messages" (connection_id);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_financial_ledger_idempotency_key_key" ON "platform_financial_ledger" (idempotency_key);
CREATE INDEX IF NOT EXISTS "platform_financial_ledger_member_idx" ON "platform_financial_ledger" (member_id, created_at DESC) WHERE (member_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS "platform_financial_ledger_order_idx" ON "platform_financial_ledger" (order_id) WHERE (order_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_financial_ledger_provider_reference_unique" ON "platform_financial_ledger" (provider, external_reference);
CREATE INDEX IF NOT EXISTS "platform_financial_ledger_status_type_idx" ON "platform_financial_ledger" (entry_status, entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_purchase_requests_buyer" ON "purchase_requests" (buyer_member_id);
CREATE INDEX IF NOT EXISTS "idx_purchase_requests_city_status_created" ON "purchase_requests" (destination_city, status, created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_purchase_requests_load_id" ON "purchase_requests" (load_id);
CREATE INDEX IF NOT EXISTS "idx_purchase_requests_status" ON "purchase_requests" (status);
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_request_number_uidx" ON "purchase_requests" (request_number);
CREATE INDEX IF NOT EXISTS "idx_rating_messages_sender_user_id" ON "rating_messages" (sender_user_id);
CREATE INDEX IF NOT EXISTS "rating_messages_rating_created_idx" ON "rating_messages" (rating_id, created_at);
CREATE INDEX IF NOT EXISTS "idx_ratings_reviewer_member_id" ON "ratings" (reviewer_member_id);
CREATE INDEX IF NOT EXISTS "idx_ratings_target_load_id" ON "ratings" (target_load_id);
CREATE INDEX IF NOT EXISTS "idx_ratings_target_member_id" ON "ratings" (target_member_id);
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_one_review_per_order_target" ON "ratings" (order_id, reviewer_member_id, target_type);
CREATE UNIQUE INDEX IF NOT EXISTS "seller_bank_accounts_member_id_key" ON "seller_bank_accounts" (member_id);
CREATE INDEX IF NOT EXISTS "idx_seller_financial_transactions_order_id" ON "seller_financial_transactions" (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS "seller_finance_one_order_receipt_or_commission" ON "seller_financial_transactions" (order_id, transaction_type) WHERE ((order_id IS NOT NULL) AND (transaction_type = ANY (ARRAY['receipt', 'commission'])));
CREATE INDEX IF NOT EXISTS "seller_financial_transactions_member_date_idx" ON "seller_financial_transactions" (member_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS "seller_payout_requests_member_date_idx" ON "seller_payout_requests" (member_id, requested_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "seller_payout_requests_transaction_id_key" ON "seller_payout_requests" (transaction_id);
CREATE INDEX IF NOT EXISTS "idx_site_visits_member_id" ON "site_visits" (member_id);
CREATE INDEX IF NOT EXISTS "site_visits_user_id_idx" ON "site_visits" (user_id);
CREATE INDEX IF NOT EXISTS "site_visits_visited_at_idx" ON "site_visits" (visited_at DESC);
CREATE INDEX IF NOT EXISTS "idx_social_contacts_external" ON "social_contacts" (external_user_id);
CREATE INDEX IF NOT EXISTS "idx_social_contacts_member_id" ON "social_contacts" (member_id);
CREATE INDEX IF NOT EXISTS "idx_social_messages_connection_id" ON "social_messages" (connection_id);
CREATE INDEX IF NOT EXISTS "idx_social_messages_processed" ON "social_messages" (processed);
CREATE INDEX IF NOT EXISTS "idx_social_messages_received" ON "social_messages" (received_at);
CREATE INDEX IF NOT EXISTS "idx_social_messages_sender" ON "social_messages" (sender_id);
CREATE INDEX IF NOT EXISTS "idx_social_posts_connection_id" ON "social_posts" (connection_id);
CREATE INDEX IF NOT EXISTS "idx_webhook_events_processed" ON "webhook_events" (processed);

INSERT INTO id_sequences(sequence_name,current_value) VALUES ('orders_invoice_number',0),('purchase_requests_request_number',0) ON CONFLICT(sequence_name) DO NOTHING;

-- HISTORICAL SNAPSHOT: this dump predates the 2026-10-18 role, storefront, order, and storage policy migrations.
-- Do not apply this file to production; use the ordered files in supabase/migrations and the live schema baseline.
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS a
    WHERE a.auth_user_id = (SELECT auth.uid())
      AND a.admin_role = 'city_manager'
      AND a.is_active = true
      AND a.city = target_city
  );
$$;


ALTER FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_is_main_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS a
    WHERE a.auth_user_id = (SELECT auth.uid())
      AND a.admin_role = 'main_admin'
      AND a.is_active = true
  );
$$;


ALTER FUNCTION "public"."terrabar_is_main_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_user_cities" (
    "admin_user_id" "uuid" NOT NULL,
    "city_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_user_cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "admin_role" "text" NOT NULL,
    "city" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "login_username" "text",
    "display_name" "text",
    CONSTRAINT "admin_city_rule" CHECK (((("admin_role" = 'main_admin'::"text") AND ("city" IS NULL)) OR (("admin_role" = 'city_manager'::"text") AND ("city" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "city")) > 0)))),
    CONSTRAINT "admin_users_admin_role_check" CHECK (("admin_role" = ANY (ARRAY['main_admin'::"text", 'city_manager'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_member_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cities" (
    "city_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cities_city_name_check" CHECK (("length"("btrim"("city_name")) > 0))
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."city_neighbors" (
    "city_name" "text" NOT NULL,
    "neighbor_city_name" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "city_neighbors_check" CHECK (("city_name" <> "neighbor_city_name"))
);


ALTER TABLE "public"."city_neighbors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."load_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "load_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."load_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."load_price_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "load_id" "uuid" NOT NULL,
    "min_quantity" numeric(14,3) DEFAULT 0 NOT NULL,
    "max_quantity" numeric(14,3),
    "unit_price" numeric(14,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sale_type" "text" DEFAULT 'regular'::"text" NOT NULL,
    "minimum_packages" numeric DEFAULT 1 NOT NULL,
    CONSTRAINT "load_price_tiers_minimum_packages_check" CHECK (("minimum_packages" >= (1)::numeric)),
    CONSTRAINT "load_price_tiers_sale_type_check" CHECK (("sale_type" = ANY (ARRAY['retail'::"text", 'wholesale'::"text", 'special'::"text", 'professional'::"text", 'regular'::"text", 'pro'::"text"]))),
    CONSTRAINT "valid_quantity_range" CHECK ((("min_quantity" >= (0)::numeric) AND (("max_quantity" IS NULL) OR ("max_quantity" >= "min_quantity")))),
    CONSTRAINT "valid_unit_price" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."load_price_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "city" "text" NOT NULL,
    "role" "text" NOT NULL,
    "product_type" "text" NOT NULL,
    "origin" "text" NOT NULL,
    "engine" "text",
    "source_market" "text",
    "price" numeric NOT NULL,
    "price_unit" "text" NOT NULL,
    "quality" "text",
    "description" "text",
    "ready_date" "date" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_phone" "text",
    "min_quantity" numeric,
    "unit" "text" NOT NULL,
    "owner_member_id" "uuid",
    "seller_type" "text",
    "source_region" "text",
    "sale_type" "text",
    "min_order_quantity" numeric(14,3),
    "count" numeric,
    "package_type" "text" DEFAULT 'کارتن'::"text" NOT NULL,
    "package_weight" numeric DEFAULT 10 NOT NULL
);


ALTER TABLE "public"."loads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "role_code" "text" NOT NULL,
    "approval_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "member_roles_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "member_roles_check" CHECK (((("approval_status" = 'approved'::"text") AND ("approved_by" IS NOT NULL) AND ("approved_at" IS NOT NULL)) OR ("approval_status" <> 'approved'::"text"))),
    CONSTRAINT "member_roles_role_code_check" CHECK (("role_code" = ANY (ARRAY['supplier'::"text", 'bar_seller'::"text", 'buyer'::"text", 'special_buyer'::"text", 'professional_buyer'::"text"])))
);


ALTER TABLE "public"."member_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "city" "text" NOT NULL,
    "role" "text" NOT NULL,
    "products" "text",
    "verification_status" "text",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "email" "text"
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "language" "text" DEFAULT 'fa'::"text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "load_id" "uuid" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_phone" "text",
    "customer_city" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "price" numeric,
    "total_price" numeric,
    "delivery_address" "text",
    "delivery_type" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "buyer_member_id" "uuid",
    "seller_member_id" "uuid",
    "customer_email" "text",
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "payment_provider" "text",
    "payment_reference" "text",
    "paid_at" timestamp with time zone,
    "delivery_status" "text" DEFAULT 'awaiting_payment'::"text" NOT NULL,
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "delivery_confirmation_method" "text",
    "delivery_confirmed_by" "uuid",
    "sale_type" "text" DEFAULT 'regular'::"text" NOT NULL,
    CONSTRAINT "orders_sale_type_check" CHECK (("sale_type" = ANY (ARRAY['retail'::"text", 'wholesale'::"text", 'special'::"text", 'professional'::"text", 'regular'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."payment_status" IS 'Payment lifecycle: unpaid, pending, paid, failed, refunded. Only trusted server/webhook may mark paid.';



COMMENT ON COLUMN "public"."orders"."payment_reference" IS 'Payment gateway transaction reference; never accepted from a browser client as proof of payment.';



COMMENT ON COLUMN "public"."orders"."delivery_status" IS 'Delivery lifecycle: awaiting_payment, awaiting_dispatch, shipped, delivered, disputed. Updated only by trusted workflow.';



CREATE TABLE IF NOT EXISTS "public"."outgoing_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "recipient_id" "text",
    "recipient_phone" "text",
    "message_text" "text",
    "message_type" "text" DEFAULT 'text'::"text",
    "external_message_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."outgoing_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_member_id" "uuid",
    "product_type" "text" NOT NULL,
    "quantity" numeric(14,3) NOT NULL,
    "quantity_unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "destination_city" "text",
    "quality_requirements" "text",
    "needed_by" "date",
    "notes" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "load_id" "uuid"
);


ALTER TABLE "public"."purchase_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "account_name" "text",
    "account_id" "text",
    "status" "text" DEFAULT 'disconnected'::"text" NOT NULL,
    "connected_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "external_user_id" "text",
    "full_name" "text",
    "phone" "text",
    "username" "text",
    "city" "text",
    "role" "text",
    "member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "sender_name" "text",
    "sender_phone" "text",
    "sender_id" "text",
    "message_text" "text",
    "message_type" "text" DEFAULT 'text'::"text",
    "external_message_id" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "content" "text",
    "media_url" "text",
    "external_post_id" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "event_type" "text",
    "external_event_id" "text",
    "payload" "jsonb",
    "processed" boolean DEFAULT false NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_user_cities"
    ADD CONSTRAINT "admin_user_cities_pkey" PRIMARY KEY ("admin_user_id", "city_name");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("city_name");



ALTER TABLE ONLY "public"."city_neighbors"
    ADD CONSTRAINT "city_neighbors_pkey" PRIMARY KEY ("city_name", "neighbor_city_name");



ALTER TABLE ONLY "public"."load_images"
    ADD CONSTRAINT "load_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."load_price_tiers"
    ADD CONSTRAINT "load_price_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loads"
    ADD CONSTRAINT "loads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_roles"
    ADD CONSTRAINT "member_roles_member_id_role_code_key" UNIQUE ("member_id", "role_code");



ALTER TABLE ONLY "public"."member_roles"
    ADD CONSTRAINT "member_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outgoing_messages"
    ADD CONSTRAINT "outgoing_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_connections"
    ADD CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_contacts"
    ADD CONSTRAINT "social_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_messages"
    ADD CONSTRAINT "social_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "admin_users_login_username_unique" ON "public"."admin_users" USING "btree" ("lower"("login_username")) WHERE ("login_username" IS NOT NULL);



CREATE INDEX "idx_audit_logs_created" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_load_images_load" ON "public"."load_images" USING "btree" ("load_id");



CREATE INDEX "idx_load_price_tiers_load_id" ON "public"."load_price_tiers" USING "btree" ("load_id");



CREATE INDEX "idx_loads_city" ON "public"."loads" USING "btree" ("city");



CREATE INDEX "idx_loads_city_product" ON "public"."loads" USING "btree" ("city", "product_type");



CREATE INDEX "idx_loads_owner" ON "public"."loads" USING "btree" ("owner_member_id");



CREATE INDEX "idx_loads_product" ON "public"."loads" USING "btree" ("product_type");



CREATE INDEX "idx_loads_status" ON "public"."loads" USING "btree" ("status");



CREATE INDEX "idx_members_phone" ON "public"."members" USING "btree" ("phone");



CREATE INDEX "idx_orders_buyer_member_id" ON "public"."orders" USING "btree" ("buyer_member_id");



CREATE INDEX "idx_orders_load_id" ON "public"."orders" USING "btree" ("load_id");



CREATE INDEX "idx_orders_seller_member_id" ON "public"."orders" USING "btree" ("seller_member_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_purchase_requests_buyer" ON "public"."purchase_requests" USING "btree" ("buyer_member_id");



CREATE INDEX "idx_purchase_requests_load_id" ON "public"."purchase_requests" USING "btree" ("load_id");



CREATE INDEX "idx_purchase_requests_status" ON "public"."purchase_requests" USING "btree" ("status");



CREATE INDEX "idx_social_contacts_external" ON "public"."social_contacts" USING "btree" ("external_user_id");



CREATE INDEX "idx_social_messages_processed" ON "public"."social_messages" USING "btree" ("processed");



CREATE INDEX "idx_social_messages_received" ON "public"."social_messages" USING "btree" ("received_at");



CREATE INDEX "idx_social_messages_sender" ON "public"."social_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_webhook_events_processed" ON "public"."webhook_events" USING "btree" ("processed");



CREATE UNIQUE INDEX "load_price_tiers_load_sale_type_uidx" ON "public"."load_price_tiers" USING "btree" ("load_id", "sale_type");



CREATE UNIQUE INDEX "members_auth_user_id_uidx" ON "public"."members" USING "btree" ("auth_user_id");



CREATE INDEX "orders_delivery_status_created_idx" ON "public"."orders" USING "btree" ("delivery_status", "created_at" DESC);



CREATE INDEX "orders_payment_status_created_idx" ON "public"."orders" USING "btree" ("payment_status", "created_at" DESC);



ALTER TABLE ONLY "public"."admin_user_cities"
    ADD CONSTRAINT "admin_user_cities_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_user_cities"
    ADD CONSTRAINT "admin_user_cities_city_name_fkey" FOREIGN KEY ("city_name") REFERENCES "public"."cities"("city_name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."city_neighbors"
    ADD CONSTRAINT "city_neighbors_city_name_fkey" FOREIGN KEY ("city_name") REFERENCES "public"."cities"("city_name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."city_neighbors"
    ADD CONSTRAINT "city_neighbors_neighbor_city_name_fkey" FOREIGN KEY ("neighbor_city_name") REFERENCES "public"."cities"("city_name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."load_images"
    ADD CONSTRAINT "load_images_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."load_price_tiers"
    ADD CONSTRAINT "load_price_tiers_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loads"
    ADD CONSTRAINT "loads_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."member_roles"
    ADD CONSTRAINT "member_roles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."member_roles"
    ADD CONSTRAINT "member_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_member_id_fkey" FOREIGN KEY ("buyer_member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_member_id_fkey" FOREIGN KEY ("seller_member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."outgoing_messages"
    ADD CONSTRAINT "outgoing_messages_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_buyer_member_id_fkey" FOREIGN KEY ("buyer_member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."social_contacts"
    ADD CONSTRAINT "social_contacts_member_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."social_messages"
    ADD CONSTRAINT "social_messages_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id");



ALTER TABLE "public"."admin_user_cities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_user_cities_main_admin_manage" ON "public"."admin_user_cities" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "admin_user_cities_read_self_or_main_admin" ON "public"."admin_user_cities" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "admin_user_cities"."admin_user_id") AND ("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."is_active" = true) AND ("au"."admin_role" = 'city_manager'::"text"))))));



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users_read_own_active" ON "public"."admin_users" FOR SELECT TO "authenticated" USING ((("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_active" = true)));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_read_main_admin" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cities_main_admin_manage" ON "public"."cities" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "cities_read_active_authenticated" ON "public"."cities" FOR SELECT TO "authenticated" USING (("is_active" OR "public"."terrabar_is_main_admin"()));



ALTER TABLE "public"."city_neighbors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "city_neighbors_main_admin_manage" ON "public"."city_neighbors" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "city_neighbors_read_authenticated" ON "public"."city_neighbors" FOR SELECT TO "authenticated" USING (("is_enabled" OR "public"."terrabar_is_main_admin"()));



ALTER TABLE "public"."load_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "load_images_delete_owned_loads" ON "public"."load_images" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_images"."load_id"))));



CREATE POLICY "load_images_insert_owned_loads" ON "public"."load_images" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_images"."load_id"))));



CREATE POLICY "load_images_read_visible_loads" ON "public"."load_images" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."loads" "l"
  WHERE ("l"."id" = "load_images"."load_id"))));



CREATE POLICY "load_images_update_owned_loads" ON "public"."load_images" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_images"."load_id")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_images"."load_id"))));



ALTER TABLE "public"."load_price_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "load_price_tiers_delete_owned_loads" ON "public"."load_price_tiers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_price_tiers"."load_id"))));



CREATE POLICY "load_price_tiers_insert_owned_loads" ON "public"."load_price_tiers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_price_tiers"."load_id"))));



CREATE POLICY "load_price_tiers_read_visible_loads" ON "public"."load_price_tiers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."loads" "l"
  WHERE ("l"."id" = "load_price_tiers"."load_id"))));



CREATE POLICY "load_price_tiers_update_owned_loads" ON "public"."load_price_tiers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_price_tiers"."load_id")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_price_tiers"."load_id"))));



ALTER TABLE "public"."loads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loads_city_manager_review_update" ON "public"."loads" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "loads"."city") OR ("au"."city" = "loads"."city")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "loads"."city") OR ("au"."city" = "loads"."city"))))));



CREATE POLICY "loads_insert_approved_member" ON "public"."loads" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'active'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."member_roles" "mr" ON (("mr"."member_id" = "m"."id")))
  WHERE (("m"."id" = "loads"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("mr"."approval_status" = 'approved'::"text") AND ("mr"."role_code" = ANY (ARRAY['supplier'::"text", 'bar_seller'::"text", 'seller'::"text"]))))) AND ("quantity" > (0)::numeric) AND ("price" > (0)::numeric) AND ("count" > (0)::numeric) AND ("min_order_quantity" > (0)::numeric) AND ("min_order_quantity" <= "count") AND ("min_quantity" > (0)::numeric) AND ("min_quantity" <= "quantity")));



COMMENT ON POLICY "loads_insert_approved_member" ON "public"."loads" IS 'Only approved supplier/bar-seller members can publish a valid load immediately; role approval is the publication gate.';



CREATE POLICY "loads_main_admin_review_update" ON "public"."loads" FOR UPDATE TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "loads_owner_deactivate_update" ON "public"."loads" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members" "owner"
  WHERE (("owner"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("owner"."id" = "loads"."member_id") OR ("owner"."id" = "loads"."owner_member_id")))))) WITH CHECK ((("status" = ANY (ARRAY['inactive'::"text", 'pending'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."members" "owner"
  WHERE (("owner"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("owner"."id" = "loads"."member_id") OR ("owner"."id" = "loads"."owner_member_id")))))));



CREATE POLICY "loads_select_authorized" ON "public"."loads" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "loads"."city") OR ("au"."city" = "loads"."city"))))) OR (EXISTS ( SELECT 1
   FROM "public"."members" "owner"
  WHERE (("owner"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("owner"."id" = "loads"."member_id") OR ("owner"."id" = "loads"."owner_member_id"))))) OR (("status" = 'active'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "m"."id") AND ("mr"."role_code" = 'professional_buyer'::"text") AND ("mr"."approval_status" = 'approved'::"text")))) OR (("m"."city" = "loads"."city") AND (COALESCE("loads"."sale_type", 'regular'::"text") = 'regular'::"text") AND (("m"."role" = 'buyer'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "m"."id") AND ("mr"."role_code" = 'buyer'::"text")))))) OR (("loads"."sale_type" = 'special'::"text") AND (("m"."role" = 'special_buyer'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "m"."id") AND ("mr"."role_code" = 'special_buyer'::"text") AND ("mr"."approval_status" = 'approved'::"text"))))) AND (("loads"."city" = "m"."city") OR (EXISTS ( SELECT 1
           FROM "public"."city_neighbors" "cn"
          WHERE (("cn"."is_enabled" = true) AND ((("cn"."city_name" = "m"."city") AND ("cn"."neighbor_city_name" = "loads"."city")) OR (("cn"."neighbor_city_name" = "m"."city") AND ("cn"."city_name" = "loads"."city")))))))) OR (("m"."city" = "loads"."city") AND (EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "m"."id") AND ("mr"."role_code" = ANY (ARRAY['supplier'::"text", 'bar_seller'::"text"])) AND ("mr"."approval_status" = 'approved'::"text"))))))))))));



CREATE POLICY "loads_select_enabled_sales_tiers" ON "public"."loads" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (((EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "m"."id") AND ("mr"."role_code" = 'professional_buyer'::"text") AND ("mr"."approval_status" = 'approved'::"text")))) AND (EXISTS ( SELECT 1
           FROM "public"."load_price_tiers" "t"
          WHERE (("t"."load_id" = "loads"."id") AND ("t"."sale_type" = ANY (ARRAY['professional'::"text", 'pro'::"text"])))))) OR ((EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "m"."id") AND ("mr"."role_code" = 'special_buyer'::"text") AND ("mr"."approval_status" = 'approved'::"text")))) AND (("loads"."city" = "m"."city") OR (EXISTS ( SELECT 1
           FROM "public"."city_neighbors" "cn"
          WHERE (("cn"."is_enabled" = true) AND ((("cn"."city_name" = "m"."city") AND ("cn"."neighbor_city_name" = "loads"."city")) OR (("cn"."neighbor_city_name" = "m"."city") AND ("cn"."city_name" = "loads"."city"))))))) AND (EXISTS ( SELECT 1
           FROM "public"."load_price_tiers" "t"
          WHERE (("t"."load_id" = "loads"."id") AND ("t"."sale_type" = 'special'::"text"))))) OR (("loads"."city" = "m"."city") AND (("m"."role" = 'buyer'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "m"."id") AND ("mr"."role_code" = 'buyer'::"text"))))) AND (EXISTS ( SELECT 1
           FROM "public"."load_price_tiers" "t"
          WHERE (("t"."load_id" = "loads"."id") AND ("t"."sale_type" = ANY (ARRAY['retail'::"text", 'wholesale'::"text", 'regular'::"text"]))))))))))));



ALTER TABLE "public"."member_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "member_roles_city_manager_read" ON "public"."member_roles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."admin_users" "au" ON (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("m"."id" = "member_roles"."member_id") AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "m"."city") OR ("au"."city" = "m"."city"))))));



CREATE POLICY "member_roles_city_manager_update" ON "public"."member_roles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."admin_users" "au" ON (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("m"."id" = "member_roles"."member_id") AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "m"."city") OR ("au"."city" = "m"."city")))))) WITH CHECK ((("approval_status" = ANY (ARRAY['approved'::"text", 'rejected'::"text"])) AND ((("approval_status" = 'approved'::"text") AND ("approved_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("approved_at" IS NOT NULL)) OR (("approval_status" = 'rejected'::"text") AND ("approved_by" IS NULL) AND ("approved_at" IS NULL))) AND (EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."admin_users" "au" ON (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("m"."id" = "member_roles"."member_id") AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "m"."city") OR ("au"."city" = "m"."city")))))));



CREATE POLICY "member_roles_main_admin_delete" ON "public"."member_roles" FOR DELETE TO "authenticated" USING ("public"."terrabar_is_main_admin"());



CREATE POLICY "member_roles_main_admin_update" ON "public"."member_roles" FOR UPDATE TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "member_roles_read_self_or_admin" ON "public"."member_roles" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "member_roles"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "member_roles_resubmit_rejected_self" ON "public"."member_roles" FOR UPDATE TO "authenticated" USING ((("approval_status" = 'rejected'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "member_roles"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("approval_status" = 'pending'::"text") AND ("approved_by" IS NULL) AND ("approved_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "member_roles"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "member_roles_submit_pending_self" ON "public"."member_roles" FOR INSERT TO "authenticated" WITH CHECK ((("approval_status" = 'pending'::"text") AND ("approved_by" IS NULL) AND ("approved_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "member_roles"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members_city_manager_read_assigned_city" ON "public"."members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "members"."city") OR ("au"."city" = "members"."city"))))));



CREATE POLICY "members_insert_own_profile" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK ((("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("role" = ANY (ARRAY['buyer'::"text", 'supplier'::"text", 'seller'::"text", 'bar_seller'::"text"])) AND (COALESCE("verification_status", 'pending'::"text") = 'pending'::"text")));



CREATE POLICY "members_main_admin_read_all" ON "public"."members" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



CREATE POLICY "members_read_own_profile" ON "public"."members" FOR SELECT TO "authenticated" USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."message_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_templates_main_admin_manage" ON "public"."message_templates" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_insert_buyer_pending_request" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'pending'::"text") AND ("buyer_member_id" IS NOT NULL) AND ("seller_member_id" IS NOT NULL) AND ("unit" = 'package'::"text") AND ("quantity" > (0)::numeric) AND ("price" > (0)::numeric) AND ("total_price" > (0)::numeric) AND ("sale_type" = ANY (ARRAY['retail'::"text", 'wholesale'::"text", 'special'::"text", 'professional'::"text", 'regular'::"text", 'pro'::"text"])) AND ("delivery_type" = ANY (ARRAY['terrabar'::"text", 'pickup'::"text", 'buyer_carrier'::"text"])) AND (("delivery_type" = 'pickup'::"text") OR (NULLIF("btrim"("delivery_address"), ''::"text") IS NOT NULL)) AND (EXISTS ( SELECT 1
   FROM "public"."members" "buyer"
  WHERE (("buyer"."id" = "orders"."buyer_member_id") AND ("buyer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("orders"."customer_name" = "buyer"."full_name") AND (NOT ("orders"."customer_phone" IS DISTINCT FROM "buyer"."phone")) AND (NOT ("orders"."customer_email" IS DISTINCT FROM "buyer"."email")) AND ("orders"."customer_city" = "buyer"."city") AND (("buyer"."role" = 'buyer'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "buyer"."id") AND ("mr"."role_code" = ANY (ARRAY['buyer'::"text", 'special_buyer'::"text", 'professional_buyer'::"text"])) AND (("mr"."role_code" = 'buyer'::"text") OR ("mr"."approval_status" = 'approved'::"text"))))))))) AND (EXISTS ( SELECT 1
   FROM "public"."loads" "l"
  WHERE (("l"."id" = "orders"."load_id") AND ("l"."status" = 'active'::"text") AND ("l"."member_id" = "orders"."seller_member_id") AND ("orders"."quantity" >= COALESCE(( SELECT "t"."minimum_packages"
           FROM "public"."load_price_tiers" "t"
          WHERE (("t"."load_id" = "l"."id") AND ("t"."sale_type" = "orders"."sale_type"))), "l"."min_order_quantity", (1)::numeric)) AND ("orders"."quantity" <= COALESCE("l"."count", (0)::numeric)) AND ("orders"."price" = COALESCE(( SELECT "t"."unit_price"
           FROM "public"."load_price_tiers" "t"
          WHERE (("t"."load_id" = "l"."id") AND ("t"."sale_type" = "orders"."sale_type"))), "l"."price")) AND ("orders"."total_price" = (("orders"."quantity" * COALESCE("l"."package_weight", GREATEST((1)::numeric, "round"(("l"."quantity" / NULLIF("l"."count", (0)::numeric)))))) * COALESCE(( SELECT "t"."unit_price"
           FROM "public"."load_price_tiers" "t"
          WHERE (("t"."load_id" = "l"."id") AND ("t"."sale_type" = "orders"."sale_type"))), "l"."price"))))))));



CREATE POLICY "orders_read_authorized" ON "public"."orders" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."members" "buyer"
  WHERE (("buyer"."id" = "orders"."buyer_member_id") AND ("buyer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."members" "seller"
  WHERE (("seller"."id" = "orders"."seller_member_id") AND ("seller"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "orders"."customer_city") OR ("au"."city" = "orders"."customer_city")))))));



CREATE POLICY "orders_seller_review_update" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((("status" = 'pending'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "seller"
  WHERE (("seller"."id" = "orders"."seller_member_id") AND ("seller"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("status" = ANY (ARRAY['accepted'::"text", 'rejected'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."members" "seller"
  WHERE (("seller"."id" = "orders"."seller_member_id") AND ("seller"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."outgoing_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "purchase_requests_insert_own_direct_order" ON "public"."purchase_requests" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'new'::"text") AND ("load_id" IS NULL) AND ("buyer_member_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."members" "buyer"
  WHERE (("buyer"."id" = "purchase_requests"."buyer_member_id") AND ("buyer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (COALESCE("buyer"."role", ''::"text") = ANY (ARRAY['buyer'::"text", 'special_buyer'::"text", 'professional_buyer'::"text"])) AND (("purchase_requests"."destination_city" IS NULL) OR ("purchase_requests"."destination_city" = "buyer"."city")))))));



CREATE POLICY "purchase_requests_manager_update" ON "public"."purchase_requests" FOR UPDATE TO "authenticated" USING ((("status" = ANY (ARRAY['new'::"text", 'in_review'::"text", 'sourcing'::"text", 'offer_ready'::"text"])) AND ("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "purchase_requests"."destination_city") OR ("au"."city" = "purchase_requests"."destination_city")))))))) WITH CHECK ((("status" = ANY (ARRAY['in_review'::"text", 'sourcing'::"text", 'offer_ready'::"text", 'rejected'::"text", 'cancelled'::"text", 'completed'::"text"])) AND ("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "purchase_requests"."destination_city") OR ("au"."city" = "purchase_requests"."destination_city"))))))));



CREATE POLICY "purchase_requests_read_authorized" ON "public"."purchase_requests" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."members" "buyer"
  WHERE (("buyer"."id" = "purchase_requests"."buyer_member_id") AND ("buyer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "purchase_requests"."destination_city") OR ("au"."city" = "purchase_requests"."destination_city")))))));



ALTER TABLE "public"."social_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."terrabar_is_main_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_is_main_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."terrabar_is_main_admin"() TO "authenticated";



GRANT ALL ON TABLE "public"."admin_user_cities" TO "anon";
GRANT ALL ON TABLE "public"."admin_user_cities" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_user_cities" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "service_role";
GRANT SELECT ON TABLE "public"."admin_users" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."city_neighbors" TO "anon";
GRANT ALL ON TABLE "public"."city_neighbors" TO "authenticated";
GRANT ALL ON TABLE "public"."city_neighbors" TO "service_role";



GRANT SELECT,INSERT,MAINTAIN,UPDATE ON TABLE "public"."load_images" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."load_images" TO "authenticated";
GRANT ALL ON TABLE "public"."load_images" TO "service_role";



GRANT SELECT,INSERT,MAINTAIN,UPDATE ON TABLE "public"."load_price_tiers" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."load_price_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."load_price_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."loads" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("name"),INSERT("name") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("quantity"),INSERT("quantity") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("city"),INSERT("city") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("role"),INSERT("role") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("product_type"),INSERT("product_type") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("origin"),INSERT("origin") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("engine"),INSERT("engine") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("source_market") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("price"),INSERT("price") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("price_unit"),INSERT("price_unit") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("quality"),INSERT("quality") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("description"),INSERT("description") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("ready_date"),INSERT("ready_date") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("status"),INSERT("status"),UPDATE("status") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("member_id"),INSERT("member_id") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."loads" TO "authenticated";



GRANT INSERT("contact_phone") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("min_quantity"),INSERT("min_quantity") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("unit"),INSERT("unit") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("owner_member_id"),INSERT("owner_member_id") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("seller_type"),INSERT("seller_type") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("source_region"),INSERT("source_region") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("sale_type"),INSERT("sale_type") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("min_order_quantity"),INSERT("min_order_quantity") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("count"),INSERT("count") ON TABLE "public"."loads" TO "authenticated";



GRANT ALL ON TABLE "public"."member_roles" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("member_id") ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("role_code") ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("approval_status"),UPDATE("approval_status") ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("approved_by"),UPDATE("approved_by") ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("approved_at"),UPDATE("approved_at") ON TABLE "public"."member_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."members" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("full_name") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("phone") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("city") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("role") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("products") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("verification_status") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("auth_user_id") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("email") ON TABLE "public"."members" TO "authenticated";



GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("load_id"),INSERT("load_id") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("customer_name"),INSERT("customer_name") ON TABLE "public"."orders" TO "authenticated";



GRANT INSERT("customer_phone") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("customer_city"),INSERT("customer_city") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("quantity"),INSERT("quantity") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("unit"),INSERT("unit") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("price"),INSERT("price") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("total_price"),INSERT("total_price") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivery_address"),INSERT("delivery_address") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivery_type"),INSERT("delivery_type") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("status"),INSERT("status"),UPDATE("status") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("notes"),INSERT("notes") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("buyer_member_id"),INSERT("buyer_member_id") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("seller_member_id"),INSERT("seller_member_id") ON TABLE "public"."orders" TO "authenticated";



GRANT INSERT("customer_email") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("payment_status") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("paid_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivery_status") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("shipped_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivered_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivery_confirmation_method") ON TABLE "public"."orders" TO "authenticated";



GRANT ALL ON TABLE "public"."outgoing_messages" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_requests" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("buyer_member_id"),INSERT("buyer_member_id") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("product_type"),INSERT("product_type") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("quantity"),INSERT("quantity") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("quantity_unit"),INSERT("quantity_unit") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("destination_city"),INSERT("destination_city") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("quality_requirements"),INSERT("quality_requirements") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("needed_by"),INSERT("needed_by") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("notes"),INSERT("notes") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("status"),INSERT("status"),UPDATE("status") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("load_id"),INSERT("load_id") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."social_connections" TO "service_role";



GRANT ALL ON TABLE "public"."social_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."social_messages" TO "service_role";



GRANT ALL ON TABLE "public"."social_posts" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








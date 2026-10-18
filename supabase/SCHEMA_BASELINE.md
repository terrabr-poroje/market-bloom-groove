# Terrabar Supabase schema baseline inventory

> Original column inventory generated from live Supabase project `gznsxqeyhnuzglliijzz` on 2026-10-15; migration history and live counts refreshed on 2026-10-18.
> This is an **inventory/reference**, not a runnable migration or full SQL dump. Do not apply it to a database.
> Detailed per-table column and policy notes below are the original 2026-10-15 snapshot unless updated in the live-access section. Use migration files and the live schema for later changes.

## Migration history observed in Supabase

| Version | Name |
|---|---|
| 20261014211818 | `restrict_rls_auto_enable_execution` |
| 20261014214911 | `add_city_access_and_member_roles` |
| 20261014215700 | `special_buyer_city_access` |
| 20261014221645 | `secure_admin_helper_functions` |
| 20261014221826 | `loads_children_and_internal_rls` |
| 20261015211128 | `membership_and_load_submission_policies` |
| 20261015212303 | `approved_members_publish_loads_immediately` |
| 20261015212626 | `order_payment_and_delivery_lifecycle` |
| 20261015212721 | `order_lifecycle_read_access` |
| 20261015222326 | `terrabar_load_photo_storage_policies` |
| 20261015222806 | `load_sale_type_price_tiers` |
| 20261015222940 | `orders_sale_type_snapshot` |
| 20261015223012 | `load_package_type` |
| 20261015223133 | `order_pricing_uses_sales_tier` |
| 20261015223242 | `loads_select_enabled_sales_tiers` |
| 20261017124538 | `restore_authenticated_marketplace_table_privileges` |
| 20261017131436 | `admin_username_login` |
| 20261017131642 | `seed_terrabar_market_cities` |
| 20261017132342 | `fix_terrabar_load_image_read_policy` |
| 20261017143000 | `seed_market_cities_and_neighbors` |
| 20261018141011 | `verified_member_load_ratings` |
| 20261018145608 | `track_authenticated_load_search_visits` |
| 20261018164650 | `secure_order_linked_private_ratings` |
| 20261018164803 | `one_rating_per_completed_order` |
| 20261018175714 | `seller_financial_accounts_and_ledger` |
| 20261018183200 | `membership_resubmission_note` |
| 20261018183437 | `rating_feedback_messages` |
| 20261018183623 | `ratings_admin_review_access` |
| 20261018184914 | `supplier_professional_marketplace_access` |
| 20261018193138 | `align_professional_roles_storefront_and_load_access` |
| 20261018193627 | `remove_legacy_storage_image_policies` |
| 20261018193810 | `align_order_request_buyer_roles` |
| 20261018194031 | `enforce_supplier_inventory_and_professional_order_audience` |
| 20261018194535 | `normalize_supplier_type_for_marketplace_rls` |
| 20261018195459 | `restrict_anonymous_data_access` |

## Live access-policy changes verified on 2026-10-18

- Public schema currently contains **24 base tables** and **51 public-schema RLS policies**.
- Approved supplier and bar_seller roles (including legacy seller) are the professional marketplace audience. Legacy professional_buyer does not grant unrestricted professional access.
- Supplier-origin inventory is excluded from ordinary-buyer city inventory, even if legacy seller fields are blank or the base sale type is old.
- Non-professional roles see ordinary active inventory in their own city; city managers are restricted to assigned cities; main administrators retain administrative access.
- Professional orders require an approved supplier, bar_seller, or legacy seller role. Direct purchase requests accept those approved professional roles as well as ordinary buyers.
- Storefront identity is exposed through authenticated RPC public.get_storefront_member(uuid) with only minimal approved-member fields; members-table RLS was not broadened.
- Private load-image storage policies check ownership and parent-load visibility; permissive legacy storage policies were removed.
- Anonymous grants were removed from private marketplace, finance, ratings, admin-assignment, city-management, and visit analytics data. The visit summary view now uses invoker security so base-table RLS applies.
- **Live data caveat:** there are currently 0 rows in public.loads. SQL policies and app build can be verified, but full end-to-end marketplace tests require an approved supplier/bar-seller account to publish a test load and an ordinary buyer account to attempt access.

## Public tables

Total: **24** base tables. Total public-schema policies: **51** (live count refreshed 2026-10-18).

### `public.members`

- RLS enabled: **yes**
- Policies: **1** (`members_read_own_profile` SELECT)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `full_name` | `text` | no | — |
| `phone` | `text` | no | — |
| `city` | `text` | no | — |
| `role` | `text` | no | — |
| `products` | `text` | yes | — |
| `verification_status` | `text` | yes | — |
| `joined_at` | `timestamp with time zone` | no | `now()` |
| `auth_user_id` | `uuid` | yes | — |

Primary key: `id`.

Foreign keys:
- `purchase_requests_buyer_member_id_fkey`: `purchase_requests.buyer_member_id` → `members.id`
- `loads_member_id_fkey`: `loads.member_id` → `members.id`
- `social_contacts_member_fkey`: `social_contacts.member_id` → `members.id`
- `orders_buyer_member_id_fkey`: `orders.buyer_member_id` → `members.id`
- `orders_seller_member_id_fkey`: `orders.seller_member_id` → `members.id`
- `member_roles_member_id_fkey`: `member_roles.member_id` → `members.id`

### `public.loads`

- RLS enabled: **yes**
- Policies: **2** (`loads_owner_access` SELECT, `loads_special_buyer_city_access` SELECT)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `name` | `text` | no | — |
| `quantity` | `numeric` | no | — |
| `city` | `text` | no | — |
| `role` | `text` | no | — |
| `product_type` | `text` | no | — |
| `origin` | `text` | no | — |
| `engine` | `text` | yes | — |
| `source_market` | `text` | yes | — |
| `price` | `numeric` | no | — |
| `price_unit` | `text` | no | — |
| `quality` | `text` | yes | — |
| `description` | `text` | yes | — |
| `ready_date` | `date` | no | — |
| `status` | `text` | no | `'active'::text` |
| `member_id` | `uuid` | no | — |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `updated_at` | `timestamp with time zone` | no | `now()` |
| `contact_phone` | `text` | yes | — |
| `min_quantity` | `numeric` | yes | — |
| `unit` | `text` | no | — |
| `owner_member_id` | `uuid` | yes | — |
| `seller_type` | `text` | yes | — |
| `source_region` | `text` | yes | — |
| `sale_type` | `text` | yes | — |
| `min_order_quantity` | `numeric` | yes | — |
| `count` | `numeric` | yes | — |

Primary key: `id`.

Foreign keys:
- `orders_load_id_fkey`: `orders.load_id` → `loads.id`
- `loads_member_id_fkey`: `loads.member_id` → `members.id`
- `load_images_load_id_fkey`: `load_images.load_id` → `loads.id`
- `load_price_tiers_load_id_fkey`: `load_price_tiers.load_id` → `loads.id`
- `purchase_requests_load_id_fkey`: `purchase_requests.load_id` → `loads.id`

### `public.orders`

- RLS enabled: **yes**
- Policies: **0**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `load_id` | `uuid` | no | — |
| `customer_name` | `text` | no | — |
| `customer_phone` | `text` | no | — |
| `customer_city` | `text` | no | — |
| `quantity` | `numeric` | no | — |
| `unit` | `text` | no | — |
| `price` | `numeric` | yes | — |
| `total_price` | `numeric` | yes | — |
| `delivery_address` | `text` | yes | — |
| `delivery_type` | `text` | yes | — |
| `status` | `text` | no | `'pending'::text` |
| `notes` | `text` | yes | — |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `updated_at` | `timestamp with time zone` | no | `now()` |
| `buyer_member_id` | `uuid` | yes | — |
| `seller_member_id` | `uuid` | yes | — |

Primary key: `id`.

Foreign keys:
- `orders_seller_member_id_fkey`: `orders.seller_member_id` → `members.id`
- `orders_load_id_fkey`: `orders.load_id` → `loads.id`
- `orders_buyer_member_id_fkey`: `orders.buyer_member_id` → `members.id`

### `public.social_connections`

- RLS enabled: **yes**
- Policies: **0**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `platform` | `text` | no | — |
| `account_name` | `text` | yes | — |
| `account_id` | `text` | yes | — |
| `status` | `text` | no | `'disconnected'::text` |
| `connected_at` | `timestamp with time zone` | yes | — |
| `last_sync_at` | `timestamp with time zone` | yes | — |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `updated_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

Foreign keys:
- `outgoing_messages_connection_fkey`: `outgoing_messages.connection_id` → `social_connections.id`
- `social_messages_connection_fkey`: `social_messages.connection_id` → `social_connections.id`
- `social_posts_connection_fkey`: `social_posts.connection_id` → `social_connections.id`

### `public.social_messages`

- RLS enabled: **yes**
- Policies: **0**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `connection_id` | `uuid` | no | — |
| `platform` | `text` | no | — |
| `sender_name` | `text` | yes | — |
| `sender_phone` | `text` | yes | — |
| `sender_id` | `text` | yes | — |
| `message_text` | `text` | yes | — |
| `message_type` | `text` | yes | `'text'::text` |
| `external_message_id` | `text` | yes | — |
| `received_at` | `timestamp with time zone` | no | `now()` |
| `processed` | `boolean` | no | `false` |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

Foreign keys:
- `social_messages_connection_fkey`: `social_messages.connection_id` → `social_connections.id`

### `public.social_posts`

- RLS enabled: **yes**
- Policies: **0**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `connection_id` | `uuid` | no | — |
| `platform` | `text` | no | — |
| `content` | `text` | yes | — |
| `media_url` | `text` | yes | — |
| `external_post_id` | `text` | yes | — |
| `status` | `text` | no | `'draft'::text` |
| `published_at` | `timestamp with time zone` | yes | — |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `updated_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

Foreign keys:
- `social_posts_connection_fkey`: `social_posts.connection_id` → `social_connections.id`

### `public.social_contacts`

- RLS enabled: **yes**
- Policies: **0**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `platform` | `text` | no | — |
| `external_user_id` | `text` | yes | — |
| `full_name` | `text` | yes | — |
| `phone` | `text` | yes | — |
| `username` | `text` | yes | — |
| `city` | `text` | yes | — |
| `role` | `text` | yes | — |
| `member_id` | `uuid` | yes | — |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `updated_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

Foreign keys:
- `social_contacts_member_fkey`: `social_contacts.member_id` → `members.id`

### `public.webhook_events`

- RLS enabled: **yes**
- Policies: **0**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `platform` | `text` | no | — |
| `event_type` | `text` | yes | — |
| `external_event_id` | `text` | yes | — |
| `payload` | `jsonb` | yes | — |
| `processed` | `boolean` | no | `false` |
| `received_at` | `timestamp with time zone` | no | `now()` |
| `processed_at` | `timestamp with time zone` | yes | — |

Primary key: `id`.

### `public.message_templates`

- RLS enabled: **yes**
- Policies: **1** (`message_templates_main_admin_manage` ALL)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `platform` | `text` | no | — |
| `name` | `text` | no | — |
| `content` | `text` | no | — |
| `language` | `text` | yes | `'fa'::text` |
| `status` | `text` | no | `'active'::text` |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `updated_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

### `public.outgoing_messages`

- RLS enabled: **yes**
- Policies: **0**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `connection_id` | `uuid` | no | — |
| `recipient_id` | `text` | yes | — |
| `recipient_phone` | `text` | yes | — |
| `message_text` | `text` | yes | — |
| `message_type` | `text` | yes | `'text'::text` |
| `external_message_id` | `text` | yes | — |
| `status` | `text` | no | `'pending'::text` |
| `sent_at` | `timestamp with time zone` | yes | — |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

Foreign keys:
- `outgoing_messages_connection_fkey`: `outgoing_messages.connection_id` → `social_connections.id`

### `public.load_images`

- RLS enabled: **yes**
- Policies: **4** (`load_images_delete_owned_loads` DELETE, `load_images_insert_owned_loads` INSERT, `load_images_read_visible_loads` SELECT, `load_images_update_owned_loads` UPDATE)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `load_id` | `uuid` | no | — |
| `storage_path` | `text` | no | — |
| `display_order` | `integer` | no | `0` |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

Foreign keys:
- `load_images_load_id_fkey`: `load_images.load_id` → `loads.id`

### `public.purchase_requests`

- RLS enabled: **yes**
- Policies: **0**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `buyer_member_id` | `uuid` | yes | — |
| `product_type` | `text` | no | — |
| `quantity` | `numeric` | no | — |
| `quantity_unit` | `text` | no | `'kg'::text` |
| `destination_city` | `text` | yes | — |
| `quality_requirements` | `text` | yes | — |
| `needed_by` | `date` | yes | — |
| `notes` | `text` | yes | — |
| `status` | `text` | no | `'new'::text` |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `updated_at` | `timestamp with time zone` | no | `now()` |
| `load_id` | `uuid` | yes | — |

Primary key: `id`.

Foreign keys:
- `purchase_requests_buyer_member_id_fkey`: `purchase_requests.buyer_member_id` → `members.id`
- `purchase_requests_load_id_fkey`: `purchase_requests.load_id` → `loads.id`

### `public.audit_logs`

- RLS enabled: **yes**
- Policies: **1** (`audit_logs_read_main_admin` SELECT)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `actor_member_id` | `uuid` | yes | — |
| `action` | `text` | no | — |
| `entity_type` | `text` | no | — |
| `entity_id` | `uuid` | yes | — |
| `details` | `jsonb` | no | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

### `public.load_price_tiers`

- RLS enabled: **yes**
- Policies: **4** (`load_price_tiers_delete_owned_loads` DELETE, `load_price_tiers_insert_owned_loads` INSERT, `load_price_tiers_read_visible_loads` SELECT, `load_price_tiers_update_owned_loads` UPDATE)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `load_id` | `uuid` | no | — |
| `min_quantity` | `numeric` | no | `0` |
| `max_quantity` | `numeric` | yes | — |
| `unit_price` | `numeric` | no | — |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

Foreign keys:
- `load_price_tiers_load_id_fkey`: `load_price_tiers.load_id` → `loads.id`

### `public.admin_users`

- RLS enabled: **yes**
- Policies: **1** (`admin_users_read_own_active` SELECT)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `auth_user_id` | `uuid` | no | — |
| `admin_role` | `text` | no | — |
| `city` | `text` | yes | — |
| `is_active` | `boolean` | no | `true` |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `created_by` | `uuid` | yes | — |

Primary key: `id`.

Foreign keys:
- `admin_users_auth_user_id_fkey`: `admin_users.auth_user_id` → `auth.users.id`
- `admin_users_created_by_fkey`: `admin_users.created_by` → `auth.users.id`
- `admin_user_cities_admin_user_id_fkey`: `admin_user_cities.admin_user_id` → `admin_users.id`

### `public.cities`

- RLS enabled: **yes**
- Policies: **2** (`cities_main_admin_manage` ALL, `cities_read_active_authenticated` SELECT)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `city_name` | `text` | no | — |
| `is_active` | `boolean` | no | `true` |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `city_name`.

Foreign keys:
- `admin_user_cities_city_name_fkey`: `admin_user_cities.city_name` → `cities.city_name`
- `city_neighbors_city_name_fkey`: `city_neighbors.city_name` → `cities.city_name`
- `city_neighbors_neighbor_city_name_fkey`: `city_neighbors.neighbor_city_name` → `cities.city_name`

### `public.city_neighbors`

- RLS enabled: **yes**
- Policies: **2** (`city_neighbors_main_admin_manage` ALL, `city_neighbors_read_authenticated` SELECT)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `city_name` | `text` | no | — |
| `neighbor_city_name` | `text` | no | — |
| `is_enabled` | `boolean` | no | `true` |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `city_name`, `neighbor_city_name`.

Foreign keys:
- `city_neighbors_city_name_fkey`: `city_neighbors.city_name` → `cities.city_name`
- `city_neighbors_neighbor_city_name_fkey`: `city_neighbors.neighbor_city_name` → `cities.city_name`

### `public.admin_user_cities`

- RLS enabled: **yes**
- Policies: **2** (`admin_user_cities_main_admin_manage` ALL, `admin_user_cities_read_self_or_main_admin` SELECT)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `admin_user_id` | `uuid` | no | — |
| `city_name` | `text` | no | — |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `admin_user_id`, `city_name`.

Foreign keys:
- `admin_user_cities_city_name_fkey`: `admin_user_cities.city_name` → `cities.city_name`
- `admin_user_cities_admin_user_id_fkey`: `admin_user_cities.admin_user_id` → `admin_users.id`

### `public.member_roles`

- RLS enabled: **yes**
- Policies: **4** (`member_roles_main_admin_delete` DELETE, `member_roles_main_admin_update` UPDATE, `member_roles_read_self_or_admin` SELECT, `member_roles_submit_pending_self` INSERT)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `member_id` | `uuid` | no | — |
| `role_code` | `text` | no | — |
| `approval_status` | `text` | no | `'pending'::text` |
| `approved_by` | `uuid` | yes | — |
| `approved_at` | `timestamp with time zone` | yes | — |
| `created_at` | `timestamp with time zone` | no | `now()` |

Primary key: `id`.

Foreign keys:
- `member_roles_member_id_fkey`: `member_roles.member_id` → `members.id`
- `member_roles_approved_by_fkey`: `member_roles.approved_by` → `auth.users.id`

## Current RLS policies

### `admin_user_cities.admin_user_cities_main_admin_manage`
- Command: `ALL`
- Roles: `{authenticated}`
- USING: `terrabar_is_main_admin()`
- WITH CHECK: `terrabar_is_main_admin()`

### `admin_user_cities.admin_user_cities_read_self_or_main_admin`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `(terrabar_is_main_admin() OR (EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.id = admin_user_cities.admin_user_id) AND (au.auth_user_id = ( SELECT auth.uid() AS uid)) AND (au.is_active = true) AND (au.admin_role = 'city_manager'::text)))))`
- WITH CHECK: `—`

### `admin_users.admin_users_read_own_active`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `((auth_user_id = ( SELECT auth.uid() AS uid)) AND (is_active = true))`
- WITH CHECK: `—`

### `audit_logs.audit_logs_read_main_admin`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `terrabar_is_main_admin()`
- WITH CHECK: `—`

### `cities.cities_main_admin_manage`
- Command: `ALL`
- Roles: `{authenticated}`
- USING: `terrabar_is_main_admin()`
- WITH CHECK: `terrabar_is_main_admin()`

### `cities.cities_read_active_authenticated`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `(is_active OR terrabar_is_main_admin())`
- WITH CHECK: `—`

### `city_neighbors.city_neighbors_main_admin_manage`
- Command: `ALL`
- Roles: `{authenticated}`
- USING: `terrabar_is_main_admin()`
- WITH CHECK: `terrabar_is_main_admin()`

### `city_neighbors.city_neighbors_read_authenticated`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `(is_enabled OR terrabar_is_main_admin())`
- WITH CHECK: `—`

### `load_images.load_images_delete_owned_loads`
- Command: `DELETE`
- Roles: `{authenticated}`
- USING: `(EXISTS ( SELECT 1
   FROM (loads l
     JOIN members m ON (((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = l.member_id) OR (m.id = l.owner_member_id)))))
  WHERE (l.id = load_images.load_id)))`
- WITH CHECK: `—`

### `load_images.load_images_insert_owned_loads`
- Command: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `(EXISTS ( SELECT 1
   FROM (loads l
     JOIN members m ON (((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = l.member_id) OR (m.id = l.owner_member_id)))))
  WHERE (l.id = load_images.load_id)))`

### `load_images.load_images_read_visible_loads`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `(EXISTS ( SELECT 1
   FROM loads l
  WHERE (l.id = load_images.load_id)))`
- WITH CHECK: `—`

### `load_images.load_images_update_owned_loads`
- Command: `UPDATE`
- Roles: `{authenticated}`
- USING: `(EXISTS ( SELECT 1
   FROM (loads l
     JOIN members m ON (((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = l.member_id) OR (m.id = l.owner_member_id)))))
  WHERE (l.id = load_images.load_id)))`
- WITH CHECK: `(EXISTS ( SELECT 1
   FROM (loads l
     JOIN members m ON (((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = l.member_id) OR (m.id = l.owner_member_id)))))
  WHERE (l.id = load_images.load_id)))`

### `load_price_tiers.load_price_tiers_delete_owned_loads`
- Command: `DELETE`
- Roles: `{authenticated}`
- USING: `(EXISTS ( SELECT 1
   FROM (loads l
     JOIN members m ON (((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = l.member_id) OR (m.id = l.owner_member_id)))))
  WHERE (l.id = load_price_tiers.load_id)))`
- WITH CHECK: `—`

### `load_price_tiers.load_price_tiers_insert_owned_loads`
- Command: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `(EXISTS ( SELECT 1
   FROM (loads l
     JOIN members m ON (((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = l.member_id) OR (m.id = l.owner_member_id)))))
  WHERE (l.id = load_price_tiers.load_id)))`

### `load_price_tiers.load_price_tiers_read_visible_loads`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `(EXISTS ( SELECT 1
   FROM loads l
  WHERE (l.id = load_price_tiers.load_id)))`
- WITH CHECK: `—`

### `load_price_tiers.load_price_tiers_update_owned_loads`
- Command: `UPDATE`
- Roles: `{authenticated}`
- USING: `(EXISTS ( SELECT 1
   FROM (loads l
     JOIN members m ON (((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = l.member_id) OR (m.id = l.owner_member_id)))))
  WHERE (l.id = load_price_tiers.load_id)))`
- WITH CHECK: `(EXISTS ( SELECT 1
   FROM (loads l
     JOIN members m ON (((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = l.member_id) OR (m.id = l.owner_member_id)))))
  WHERE (l.id = load_price_tiers.load_id)))`

### `loads.loads_owner_access`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `(EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((m.id = loads.member_id) OR (m.id = loads.owner_member_id)))))`
- WITH CHECK: `—`

### `loads.loads_special_buyer_city_access`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `((status = 'active'::text) AND (sale_type = 'special'::text) AND (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND ((loads.city = m.city) OR (EXISTS ( SELECT 1
           FROM city_neighbors cn
          WHERE ((cn.city_name = m.city) AND (cn.neighbor_city_name = loads.city) AND (cn.is_enabled = true)))) OR (EXISTS ( SELECT 1
           FROM city_neighbors cn
          WHERE ((cn.city_name = loads.city) AND (cn.neighbor_city_name = m.city) AND (cn.is_enabled = true)))))))))`
- WITH CHECK: `—`

### `member_roles.member_roles_main_admin_delete`
- Command: `DELETE`
- Roles: `{authenticated}`
- USING: `terrabar_is_main_admin()`
- WITH CHECK: `—`

### `member_roles.member_roles_main_admin_update`
- Command: `UPDATE`
- Roles: `{authenticated}`
- USING: `terrabar_is_main_admin()`
- WITH CHECK: `terrabar_is_main_admin()`

### `member_roles.member_roles_read_self_or_admin`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `(terrabar_is_main_admin() OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_roles.member_id) AND (m.auth_user_id = ( SELECT auth.uid() AS uid))))))`
- WITH CHECK: `—`

### `member_roles.member_roles_submit_pending_self`
- Command: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `((approval_status = 'pending'::text) AND (approved_by IS NULL) AND (approved_at IS NULL) AND (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_roles.member_id) AND (m.auth_user_id = ( SELECT auth.uid() AS uid))))))`

### `members.members_read_own_profile`
- Command: `SELECT`
- Roles: `{authenticated}`
- USING: `(auth_user_id = ( SELECT auth.uid() AS uid))`
- WITH CHECK: `—`

### `message_templates.message_templates_main_admin_manage`
- Command: `ALL`
- Roles: `{authenticated}`
- USING: `terrabar_is_main_admin()`
- WITH CHECK: `terrabar_is_main_admin()`


## Public functions

| Function | Arguments | SECURITY DEFINER | anon EXECUTE | authenticated EXECUTE |
|---|---|---:|---:|---:|
| `rls_auto_enable` | `` | yes | no | no |
| `terrabar_is_city_manager` | `target_city text` | no | no | yes |
| `terrabar_is_main_admin` | `` | no | no | yes |

## Storage buckets

- `terrabar-load-images`: private, file limit 10485760 bytes, allowed types: image/jpeg, image/png, image/webp

## Security follow-up items

- 8 public tables have RLS enabled but no policies. Some are intentionally service-role-only integration tables; `orders` and `purchase_requests` need explicit participant/role rules before enabling client access.
- The two Terrabar admin helper functions now use SECURITY INVOKER and can be executed by authenticated users only; the `admin_users` SELECT policy limits visibility to the active user's own row.
- The private Storage bucket currently has no Storage policies; upload/read rules must be implemented with the exact object-path convention before image uploads are enabled.
- Leaked-password protection remains disabled in Supabase Auth.
- This inventory excludes row data, auth users, secrets, API keys, and environment variables.

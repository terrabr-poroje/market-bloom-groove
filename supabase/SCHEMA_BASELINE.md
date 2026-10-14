# Terrabar Supabase schema baseline inventory

> Generated from live Supabase project `gznsxqeyhnuzglliijzz` on 2026-10-15.
> This is an **inventory/reference**, not a runnable migration or full SQL dump. Do not apply it to a database.
> Refresh after schema changes. Never use this file alone to rebuild production.

## Migration history observed in Supabase

| Version | Name |
|---|---|
| 20261014211818 | `restrict_rls_auto_enable_execution` |
| 20261014214911 | `add_city_access_and_member_roles` |
| 20261014215700 | `special_buyer_city_access` |
| 20261014221645 | `secure_admin_helper_functions` |

## Public tables

Total: **19** tables. Total current policies: **13**.

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
- Policies: **1** (`loads_special_buyer_city_access` SELECT)

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
- Policies: **0**

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
- Policies: **0**

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
- Policies: **0**

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
- Policies: **0**

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


## Public functions

| Function | Arguments | SECURITY DEFINER | anon EXECUTE | authenticated EXECUTE |
|---|---|---:|---:|---:|
| `rls_auto_enable` | `` | yes | no | no |
| `terrabar_is_city_manager` | `target_city text` | no | no | yes |
| `terrabar_is_main_admin` | `` | no | no | yes |

## Security follow-up items

- 13 public tables currently have RLS enabled but no policies.
- `terrabar_is_city_manager(text)` and `terrabar_is_main_admin()` now use SECURITY INVOKER and are executable only by authenticated users. `admin_users` has a SELECT policy limited to the active user's own row, so these helpers can evaluate their checks without SECURITY DEFINER.
- No Storage policies were found during the audit.
- This inventory does not include row data, auth users, secrets, API keys, or environment variables.

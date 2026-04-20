/*
  Warnings:

  - You are about to drop the `store_users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'pending', 'preparing', 'served', 'voided');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'confirmed', 'refunded');

-- CreateEnum
CREATE TYPE "SplitBillStatus" AS ENUM ('active', 'paid');

-- DropForeignKey
ALTER TABLE "store_users" DROP CONSTRAINT "store_users_store_id_fkey";

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "announcement_en" TEXT,
ADD COLUMN     "auto_accept_orders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "max_tables" INTEGER,
ADD COLUMN     "name_en" TEXT,
ADD COLUMN     "payment_mode" TEXT,
ADD COLUMN     "service_fee_rate" DOUBLE PRECISION,
ADD COLUMN     "tax_rate" DOUBLE PRECISION,
ADD COLUMN     "tipBase" TEXT NOT NULL DEFAULT 'pretax';

-- DropTable
DROP TABLE "store_users";

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_log" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_store_id" TEXT,
    "payload" JSONB NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_licenses" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "modules" TEXT[],
    "granted_at" TIMESTAMP(3) NOT NULL,
    "granted_by" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "module_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "permissions" TEXT[],
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "clock_pin" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "number" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "qr_code" TEXT NOT NULL,
    "capacity" INTEGER,
    "current_session_id" TEXT,
    "waiter_called_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "quick_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "description_en" TEXT,
    "image_url" TEXT,
    "price" INTEGER NOT NULL,
    "original_price" INTEGER,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_staff_only" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_options" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "price_adjust" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "settlement_mode" TEXT NOT NULL DEFAULT 'unset',
    "coupon_code" TEXT,
    "coupon_type" TEXT,
    "coupon_value" INTEGER,
    "coupon_applied_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "table_name_en" TEXT,
    "session_id" TEXT,
    "status" "OrderStatus" NOT NULL,
    "device_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "last_cart_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_options" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "group_name_en" TEXT,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "price_adjust" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "tip_amount" INTEGER NOT NULL DEFAULT 0,
    "tax_amount" INTEGER NOT NULL DEFAULT 0,
    "stripe_payment_intent_id" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_items" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "paid_quantity" INTEGER NOT NULL,

    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_bills" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "percent" INTEGER,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "tip" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "status" "SplitBillStatus" NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "split_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_bill_items" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "split_bill_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "split_bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "min_order_amount" INTEGER,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "clock_in_at" TIMESTAMP(3) NOT NULL,
    "clock_out_at" TIMESTAMP(3),

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printers" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "host" TEXT,
    "port" INTEGER,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "platform_audit_log_admin_id_created_at_idx" ON "platform_audit_log"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_log_target_store_id_created_at_idx" ON "platform_audit_log"("target_store_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_log_action_idx" ON "platform_audit_log"("action");

-- CreateIndex
CREATE UNIQUE INDEX "module_licenses_store_id_key" ON "module_licenses"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_store_id_name_key" ON "roles"("store_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_store_id_username_key" ON "staff"("store_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "tables_qr_code_key" ON "tables"("qr_code");

-- CreateIndex
CREATE INDEX "tables_store_id_idx" ON "tables"("store_id");

-- CreateIndex
CREATE INDEX "categories_store_id_idx" ON "categories"("store_id");

-- CreateIndex
CREATE INDEX "menu_items_store_id_category_id_idx" ON "menu_items"("store_id", "category_id");

-- CreateIndex
CREATE INDEX "menu_item_options_menu_item_id_idx" ON "menu_item_options"("menu_item_id");

-- CreateIndex
CREATE INDEX "sessions_store_id_status_idx" ON "sessions"("store_id", "status");

-- CreateIndex
CREATE INDEX "sessions_table_id_idx" ON "sessions"("table_id");

-- CreateIndex
CREATE INDEX "orders_store_id_status_idx" ON "orders"("store_id", "status");

-- CreateIndex
CREATE INDEX "orders_session_id_idx" ON "orders"("session_id");

-- CreateIndex
CREATE INDEX "orders_store_id_created_at_idx" ON "orders"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_menu_item_id_idx" ON "order_items"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_position_key" ON "order_items"("order_id", "position");

-- CreateIndex
CREATE INDEX "payments_store_id_created_at_idx" ON "payments"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_session_id_idx" ON "payments"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_stripe_intent_unique" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payment_items_payment_id_idx" ON "payment_items"("payment_id");

-- CreateIndex
CREATE INDEX "payment_items_order_item_id_idx" ON "payment_items"("order_item_id");

-- CreateIndex
CREATE INDEX "split_bills_session_id_status_idx" ON "split_bills"("session_id", "status");

-- CreateIndex
CREATE INDEX "split_bill_items_split_bill_id_idx" ON "split_bill_items"("split_bill_id");

-- CreateIndex
CREATE INDEX "split_bill_items_order_item_id_idx" ON "split_bill_items"("order_item_id");

-- CreateIndex
CREATE INDEX "coupons_store_id_is_active_idx" ON "coupons"("store_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_store_id_code_key" ON "coupons"("store_id", "code");

-- CreateIndex
CREATE INDEX "waitlist_entries_store_id_status_idx" ON "waitlist_entries"("store_id", "status");

-- CreateIndex
CREATE INDEX "time_entries_store_id_staff_id_idx" ON "time_entries"("store_id", "staff_id");

-- CreateIndex
CREATE INDEX "printers_store_id_idx" ON "printers"("store_id");

-- AddForeignKey
ALTER TABLE "platform_audit_log" ADD CONSTRAINT "platform_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_log" ADD CONSTRAINT "platform_audit_log_target_store_id_fkey" FOREIGN KEY ("target_store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_licenses" ADD CONSTRAINT "module_licenses_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_options" ADD CONSTRAINT "menu_item_options_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_bills" ADD CONSTRAINT "split_bills_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_bills" ADD CONSTRAINT "split_bills_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_bill_items" ADD CONSTRAINT "split_bill_items_split_bill_id_fkey" FOREIGN KEY ("split_bill_id") REFERENCES "split_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_bill_items" ADD CONSTRAINT "split_bill_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printers" ADD CONSTRAINT "printers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

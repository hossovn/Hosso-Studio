CREATE TABLE `form_deliveries` (
	`id` integer PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`submission_id` integer NOT NULL,
	`channel` text NOT NULL,
	`destination` text NOT NULL,
	`status` text DEFAULT 'pending',
	`attempts` numeric DEFAULT 0,
	`next_at` text,
	`lease_until` text,
	`lease_token` text,
	`sent_at` text,
	`last_error` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `form_submissions`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX `form_deliveries_key_idx` ON `form_deliveries` (`key`);
CREATE INDEX `form_deliveries_submission_idx` ON `form_deliveries` (`submission_id`);
CREATE INDEX `form_deliveries_status_idx` ON `form_deliveries` (`status`);
CREATE INDEX `form_deliveries_next_at_idx` ON `form_deliveries` (`next_at`);
CREATE INDEX `form_deliveries_lease_until_idx` ON `form_deliveries` (`lease_until`);
CREATE INDEX `form_deliveries_updated_at_idx` ON `form_deliveries` (`updated_at`);
CREATE INDEX `form_deliveries_created_at_idx` ON `form_deliveries` (`created_at`);
CREATE TABLE `shop_saved_carts` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`generation` text,
	`lines` text DEFAULT '[]',
	`revision` numeric DEFAULT 0,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

CREATE UNIQUE INDEX `shop_saved_carts_owner_idx` ON `shop_saved_carts` (`owner`);
CREATE INDEX `shop_saved_carts_updated_at_idx` ON `shop_saved_carts` (`updated_at`);
CREATE INDEX `shop_saved_carts_created_at_idx` ON `shop_saved_carts` (`created_at`);
CREATE TABLE `shop_returns` (
	`id` integer PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`order_id` integer NOT NULL,
	`order_no` text NOT NULL,
	`items` text NOT NULL,
	`reason` text NOT NULL,
	`resolution` text DEFAULT 'refund',
	`state` text DEFAULT 'requested',
	`revision` numeric DEFAULT 0,
	`evidence` text DEFAULT '[]',
	`refund_amount` numeric DEFAULT 0,
	`restocked` integer DEFAULT false,
	`refund_reference` text,
	`history` text DEFAULT '[]',
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `shop_orders`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX `shop_returns_request_key_idx` ON `shop_returns` (`request_key`);
CREATE INDEX `shop_returns_order_idx` ON `shop_returns` (`order_id`);
CREATE INDEX `shop_returns_state_idx` ON `shop_returns` (`state`);
CREATE INDEX `shop_returns_updated_at_idx` ON `shop_returns` (`updated_at`);
CREATE INDEX `shop_returns_created_at_idx` ON `shop_returns` (`created_at`);
CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`event` text NOT NULL,
	`page_path` text,
	`campaign` text,
	`source` text,
	`session` text,
	`value` numeric,
	`reference` text,
	`experiments` text,
	`experiment_key` text,
	`variant` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

CREATE UNIQUE INDEX `analytics_events_key_idx` ON `analytics_events` (`key`);
CREATE INDEX `analytics_events_event_idx` ON `analytics_events` (`event`);
CREATE INDEX `analytics_events_page_path_idx` ON `analytics_events` (`page_path`);
CREATE INDEX `analytics_events_campaign_idx` ON `analytics_events` (`campaign`);
CREATE INDEX `analytics_events_session_idx` ON `analytics_events` (`session`);
CREATE INDEX `analytics_events_experiment_key_idx` ON `analytics_events` (`experiment_key`);
CREATE INDEX `analytics_events_variant_idx` ON `analytics_events` (`variant`);
CREATE INDEX `analytics_events_updated_at_idx` ON `analytics_events` (`updated_at`);
CREATE INDEX `analytics_events_created_at_idx` ON `analytics_events` (`created_at`);
ALTER TABLE `content_entries_locales` ADD `search_text` text;
CREATE INDEX `content_entries_search_text_idx` ON `content_entries_locales` (`search_text`,`_locale`);
ALTER TABLE `content_types` ADD `detail_template_id` integer REFERENCES pages(id);
CREATE INDEX `content_types_detail_template_idx` ON `content_types` (`detail_template_id`);
ALTER TABLE `form_submissions` ADD `submission_key` text;
ALTER TABLE `form_submissions` ADD `lead_status` text DEFAULT 'new';
ALTER TABLE `form_submissions` ADD `assigned_to_id` integer REFERENCES users(id);
ALTER TABLE `form_submissions` ADD `notes` text DEFAULT '[]';
ALTER TABLE `form_submissions` ADD `attribution` text;
ALTER TABLE `form_submissions` ADD `experiments` text;
ALTER TABLE `form_submissions` ADD `revision` numeric DEFAULT 0;
CREATE UNIQUE INDEX `form_submissions_submission_key_idx` ON `form_submissions` (`submission_key`);
CREATE INDEX `form_submissions_lead_status_idx` ON `form_submissions` (`lead_status`);
CREATE INDEX `form_submissions_assigned_to_idx` ON `form_submissions` (`assigned_to_id`);
ALTER TABLE `payload_locked_documents_rels` ADD `form_deliveries_id` integer REFERENCES form_deliveries(id);
ALTER TABLE `payload_locked_documents_rels` ADD `shop_saved_carts_id` integer REFERENCES shop_saved_carts(id);
ALTER TABLE `payload_locked_documents_rels` ADD `shop_returns_id` integer REFERENCES shop_returns(id);
ALTER TABLE `payload_locked_documents_rels` ADD `analytics_events_id` integer REFERENCES analytics_events(id);
CREATE INDEX `payload_locked_documents_rels_form_deliveries_id_idx` ON `payload_locked_documents_rels` (`form_deliveries_id`);
CREATE INDEX `payload_locked_documents_rels_shop_saved_carts_id_idx` ON `payload_locked_documents_rels` (`shop_saved_carts_id`);
CREATE INDEX `payload_locked_documents_rels_shop_returns_id_idx` ON `payload_locked_documents_rels` (`shop_returns_id`);
CREATE INDEX `payload_locked_documents_rels_analytics_events_id_idx` ON `payload_locked_documents_rels` (`analytics_events_id`);

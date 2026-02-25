-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "source_chain" TEXT NOT NULL,
    "destination_chain" TEXT NOT NULL,
    "source_token" TEXT NOT NULL,
    "destination_token" TEXT NOT NULL,
    "input_amount" TEXT NOT NULL,
    "output_amount" TEXT NOT NULL,
    "total_fee" JSONB NOT NULL,
    "estimated_time" INTEGER NOT NULL,
    "slippage_tolerance" DOUBLE PRECISION NOT NULL,
    "slippage_risk" TEXT NOT NULL,
    "reliability_score" DOUBLE PRECISION NOT NULL,
    "liquidity_score" DOUBLE PRECISION NOT NULL,
    "steps" JSONB NOT NULL,
    "raw_provider_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'quote_ready',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executions" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "user_wallet" TEXT NOT NULL,
    "transaction_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'awaiting_signature',
    "expected_output" TEXT NOT NULL,
    "expected_time" INTEGER NOT NULL,
    "expected_fee" TEXT NOT NULL,
    "actual_output" TEXT,
    "actual_time" INTEGER,
    "actual_fee" TEXT,
    "failure_reason" TEXT,
    "failover_attempted" BOOLEAN NOT NULL DEFAULT false,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_reliability" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "total_executions" INTEGER NOT NULL DEFAULT 0,
    "successful_executions" INTEGER NOT NULL DEFAULT 0,
    "failed_executions" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_execution_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_slippage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uptime_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "is_healthy" BOOLEAN NOT NULL DEFAULT true,
    "health_check_last_run" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "average_response_time_ms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_reliability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_cache" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "source_chain" TEXT NOT NULL,
    "destination_chain" TEXT NOT NULL,
    "source_token" TEXT NOT NULL,
    "destination_token" TEXT NOT NULL,
    "input_amount" TEXT NOT NULL,
    "cached_route" JSONB NOT NULL,
    "cache_key" TEXT NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_wallet" TEXT NOT NULL,
    "default_strategy" TEXT NOT NULL DEFAULT 'lowest_cost',
    "custom_weights" JSONB,
    "max_slippage" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "preferred_providers" JSONB,
    "blacklisted_chains" JSONB,
    "notify_on_completion" BOOLEAN NOT NULL DEFAULT false,
    "notification_webhook" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failover_attempts" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "original_provider" TEXT NOT NULL,
    "fallback_provider" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "was_successful" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failover_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routes_provider_source_chain_destination_chain_idx" ON "routes"("provider", "source_chain", "destination_chain");

-- CreateIndex
CREATE INDEX "routes_status_expires_at_idx" ON "routes"("status", "expires_at");

-- CreateIndex
CREATE INDEX "routes_created_at_idx" ON "routes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "executions_transaction_hash_key" ON "executions"("transaction_hash");

-- CreateIndex
CREATE INDEX "executions_route_id_idx" ON "executions"("route_id");

-- CreateIndex
CREATE INDEX "executions_user_wallet_idx" ON "executions"("user_wallet");

-- CreateIndex
CREATE INDEX "executions_status_created_at_idx" ON "executions"("status", "created_at");

-- CreateIndex
CREATE INDEX "executions_transaction_hash_idx" ON "executions"("transaction_hash");

-- CreateIndex
CREATE UNIQUE INDEX "provider_reliability_provider_key" ON "provider_reliability"("provider");

-- CreateIndex
CREATE INDEX "provider_reliability_provider_is_healthy_idx" ON "provider_reliability"("provider", "is_healthy");

-- CreateIndex
CREATE INDEX "provider_reliability_success_rate_idx" ON "provider_reliability"("success_rate");

-- CreateIndex
CREATE UNIQUE INDEX "quote_cache_cache_key_key" ON "quote_cache"("cache_key");

-- CreateIndex
CREATE INDEX "quote_cache_cache_key_expires_at_idx" ON "quote_cache"("cache_key", "expires_at");

-- CreateIndex
CREATE INDEX "quote_cache_provider_source_chain_destination_chain_idx" ON "quote_cache"("provider", "source_chain", "destination_chain");

-- CreateIndex
CREATE INDEX "quote_cache_expires_at_idx" ON "quote_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_wallet_key" ON "user_preferences"("user_wallet");

-- CreateIndex
CREATE INDEX "user_preferences_user_wallet_idx" ON "user_preferences"("user_wallet");

-- CreateIndex
CREATE INDEX "failover_attempts_execution_id_idx" ON "failover_attempts"("execution_id");

-- CreateIndex
CREATE INDEX "failover_attempts_original_provider_was_successful_idx" ON "failover_attempts"("original_provider", "was_successful");

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failover_attempts" ADD CONSTRAINT "failover_attempts_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

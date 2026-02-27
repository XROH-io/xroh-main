## XROH Computer Use Agent – Implementation Guide

This document maps your **Computer Use Agent** vision to the **current XROH codebase** (NestJS backend + Next.js dashboard) and gives you a **practical, step‑by‑step plan** to implement it.

The idea: **we don’t need full desktop control (OpenClaw) to start**. For XROH, “computer use” means:

- The **LLM agent** (Claude) controls **backend tools** (wallet, quotes, routes, tx builder, monitor…)  
- The **frontend** only handles **wallet connection + signature UI + status**  
- Over time, you can optionally add **true OS/browser control** as a separate service.

---

### 1. Where we are today (current architecture)

**Backend (NestJS, inside `backend/`):**

- `src/app.module.ts`  
  - Wires core modules: `ProvidersModule`, `QuotesModule`, `RoutesModule`, `StrategyModule`, `ApiKeysModule`, `AiModule`, etc.
- `src/modules/ai/ai.controller.ts`  
  - REST endpoint `POST /api/ai/chat`  
  - Calls `AgentService.chat(request)` and returns `AgentResponse`
- (Not shown here, but present) `AgentService` + Anthropic client  
  - Already run a **Claude tool‑use loop** to:
    - Fetch quotes
    - Compare routes
    - Explain decisions

**Frontend (Next.js, inside `dashboard/`):**

- `app/api/chat/route.ts`  
  - Proxies `POST /api/chat` → backend `POST /api/ai/chat`
- `lib/api.ts`  
  - Calls backend REST endpoints: `/quotes`, `/tokens/*`, `/quotes/changenow-rate`, etc.
- UI pages/components (e.g. `app/page.tsx`)  
  - Show forms, quotes, routes, etc.

**Key point:**  
You already have a **LLM “advisor” agent** (quotes, routes, explanations).  
We want to upgrade it into a **“computer use” executor agent** that:

- Understands **high‑level intents** (“Bridge all my USDC to Solana”)  
- Plans **multi‑step workflows**  
- Invokes **backend tools** to:
  - Read balances
  - Fetch quotes
  - Build transactions
  - Ask frontend for signatures
  - Monitor and report status

---

### 2. Target architecture (specific to XROH)

We’ll implement the big design using **five backend components** and **one frontend layer**:

1. **Intent Parser** – LLM prompt + small TS layer  
2. **Action Planner** – structured “plan” object + LLM assist  
3. **Action Executor** – TypeScript services that call tools  
4. **Tool Layer** – concrete Nest services (“wallet”, “quotes”, “tx builder”, “monitor”, etc.)  
5. **State Manager + Safety Guard** – Prisma + Redis + validation logic  
6. **Frontend UX** – chat + “approve plan” + wallet signature + status display

All of this can live **inside the existing `AiModule`** and new dedicated modules.

#### 2.1. Backend modules to add

Inside `backend/src/modules/` add:

- `computer-use/` (new module, imported by `AppModule`)
  - `computer-use.module.ts`
  - `intent-parser.service.ts`
  - `planner.service.ts`
  - `executor.service.ts`
  - `safety.service.ts`
  - `state.service.ts`
- `tools/` (or `execution-tools/`) – OR reuse existing modules where it makes sense:
  - `wallet-tools.service.ts` (interface to frontend/wallet)  
  - `balance-tools.service.ts` (wraps existing price/token modules + new balance RPCs)  
  - `quote-tools.service.ts` (wraps `QuotesModule` + providers)  
  - `transaction-tools.service.ts` (builder, broadcaster, monitor)

Keep **existing** `ProvidersModule`, `QuotesModule`, `RoutesModule`, `StrategyModule` as they are and just **wrap them as tools**.

---

### 3. Step‑by‑step plan (phased, minimal risk)

#### Stage 1 (Week 1–2): Read‑only “Computer Use” foundation

**Goal:** Agent can **understand intents** and **simulate a plan** using only read‑only tools. No real funds movement.

**Backend changes:**

- **(A) Extend AiModule to support “modes”**
  - In `AgentService` (already used by `AiController`):
    - Add support for a new “computer_use” mode:
      - Detect phrases like “bridge for me”, “do it for me”, “move all my”, “execute this plan”  
      - For such inputs, call **Intent Parser + Planner** instead of only explanation tools.

- **(B) Implement `IntentParserService` (`computer-use/intent-parser.service.ts`)**
  - Uses Claude with a **strict JSON schema** to parse:
    - `action` (bridge/swap/consolidate/rebalance)  
    - `token` / `tokens`  
    - `amount` (`all`, `percentage`, or number)  
    - `sourceChains` (`auto-detect` or explicit)  
    - `destinationChain`  
    - `constraints` (fees, time, safety level)
  - Wrap this into a Nest service that returns a **strongly typed TS object**.

- **(C) Implement `PlannerService` (`computer-use/planner.service.ts`)**
  - Input: parsed intent + current **read‑only** data (no txs).
  - It calls **tool wrappers**:
    - `BalanceToolsService.getPortfolio(walletAddress)`  
    - `QuoteToolsService.getBestRoutes(...)`
  - Produces a **`Plan` object**, e.g.:
    - `steps: Step[]` with:
      - `id`, `type`, `dependsOn`, `canRunInParallel`, `estimatedDuration`, `estimatedFee`, etc.
  - Early stage: logic can be mostly in TypeScript with **light LLM help** (Claude helps choose provider/strategies).

- **(D) Implement read‑only tools**
  - `BalanceToolsService`
    - For now: use **simulated balances** or simple “static data” until wallets are wired.
  - `QuoteToolsService`
    - Directly calls existing backend controllers/services:
      - `POST /quotes` or directly `QuotesService` inside Nest.

**Frontend changes:**

- In the chat UI (which uses `app/api/chat/route.ts` → backend):
  - Show extra info when `AgentResponse.messageType === "plan"`:
    - Example: a **“Plan card”**: steps, fees, time, chains.
  - Still **no execution**, only: “Here is a detailed plan of what I would do”.

**Result of Stage 1:**  
You have a **full intent → plan pipeline** running on **real XROH data**, but only **read‑only**. Perfect for testing and UX iterations.

---

#### Stage 2 (Week 3): Simulation mode (dry‑run execution)

**Goal:** Show the **full multi‑step workflow** (including signatures, monitoring) but **do not touch real wallets**.

**Backend:**

- Add `ExecutorService` with **simulation flag**:
  - `executePlan(plan, { simulate: true })`
  - Instead of:
    - Building real txs
    - Calling RPCs
  - It:
    - Generates **fake transaction objects** (IDs, hashes, timings, fees).
    - Runs through each step and updates state as if it executed.
  - Stores execution state via `StateService` (in DB or Redis).

- `StateService`:
  - Minimal schema (later can move to Prisma model):
    - `Execution`: `id`, `userId/wallet`, `status`, `createdAt`, `updatedAt`, `currentStep`, `planSnapshot`, etc.
    - `ExecutionStep`: `id`, `executionId`, `stepId`, `status`, `result`, `error`, `timestamps`.
  - Initially, even an **in‑memory map** (for dev) is OK; later migrate to Prisma.

- `SafetyService`:
  - In simulation mode: mostly logs checks and returns “ok”.
  - Already define validation contracts:
    - Total value thresholds
    - Allowed actions
    - Per‑wallet limits

**Frontend:**

- When backend replies with something like:
  - `messageType: "execution_plan_simulation"` and `executionId`
  - Show **timeline UI**:
    - Steps 1..N with `status: pending/in-progress/completed/failed` (simulated).
  - The user sees **exactly how it would work** without risk.

**Result of Stage 2:**  
Users (and you) can **experience the entire autonomous flow** safely. Great for aligning UX + logic before real funds.

---

#### Stage 3 (Week 4–5): Limited real execution (testnets, small amounts)

**Goal:** End‑to‑end flow with **real testnet txs**, using real wallets and RPCs, but under **tight limits**.

**Backend:**

- Implement real **Tool Layer**:

  - `WalletToolsService`
    - This is mostly a **logical interface**:
      - The backend **never** holds private keys.
      - It sends “signature requests” to the frontend and waits for a response.
    - API idea (REST or WebSocket):
      - `POST /computer-use/sign-request` with:
        - `executionId`, `stepId`, `txData` (to, data, value, chain, gas, explanation).
      - Frontend shows a wallet popup, signs, and sends back signed tx.

  - `TransactionToolsService`
    - `buildTransaction(route, walletAddress)`:
      - Uses existing route/provider services to form actual tx payloads.
    - `broadcastTransaction(signedTx)`:
      - Uses RPC clients (`ethers.js`, Solana Web3, or provider SDKs).
    - `monitorTransaction(txHash, chain)`:
      - Polls RPC or provider’s status until confirmed/failed.

  - `BalanceToolsService` (real):
    - Uses RPC / indexer APIs to read on‑chain balances across chains.

  - `QuoteToolsService`:
    - Already calling XROH quoting engine; just reuse with a thin abstraction.

- Wire these into `ExecutorService`:
  - `executePlan(plan, { simulate: false, network: "testnet" })`
    - Enforce:
      - Max amount (e.g. 10 test USDC)
      - Specific chains (Devnet, Sepolia, Mumbai)
      - Rate limits (per wallet).

**Frontend:**

- Add **wallet integration** (if not already done) in dashboard:
  - Connect Phantom / MetaMask / WalletConnect according to chain.
  - Hook an “execution approval” UI:
    - After user approves the **plan**, show step‑by‑step:
      - “Transaction 1 ready → click to sign”.
  - Implement the endpoint to receive sign requests and return signed transactions to backend.

**Result of Stage 3:**  
On **testnets**, the agent really **moves tokens** end‑to‑end, still in a controlled environment.

---

#### Stage 4 (Week 6–7+): Mainnet pilot & production rollout

Once testnet flows are stable:

- Switch to mainnet configs  
- Tighten `SafetyService` rules (daily/tx limits, whitelists, approvals)  
- Track metrics + logs (Sentry/Datadog)  
- Start with a **small allowlist of wallets/users**.

---

### 4. How this maps to your big design doc

Below is a quick mapping between your long strategy doc and **concrete XROH pieces**.

- **Intent Parser** → `IntentParserService` (Nest) + Claude prompt, called from `AgentService`
- **Action Planner** → `PlannerService` producing `Plan` objects, using:
  - `QuotesModule`, `RoutesModule`, `StrategyModule`, `ProvidersModule`
- **Action Executor** → `ExecutorService` + tool services:
  - `BalanceToolsService`, `QuoteToolsService`, `TransactionToolsService`, `WalletToolsService`
- **State Manager** → `StateService` + Prisma/Redis models (`Execution`, `ExecutionStep`)
- **Safety Guard** → `SafetyService` with:
  - Permission scopes
  - Limits
  - Sanity checks (amount vs balance, chain validity, etc.)
- **Execution Layer tools** (from your doc):
  - Wallet Connection Tool → frontend wallet + backend `WalletToolsService` handshake
  - Balance Checker Tool → `BalanceToolsService`
  - Quote Fetcher Tool → `QuoteToolsService` wrapping existing `/quotes`
  - Transaction Builder Tool → `TransactionToolsService.buildTransaction`
  - Transaction Signer Tool → frontend wallet + `/computer-use/sign-request`
  - Broadcaster Tool → `TransactionToolsService.broadcastTransaction`
  - Monitor Tool → `TransactionToolsService.monitorTransaction`
  - Notification Tool → simple Nest service (email/push/webhook/WS) later

---

### 5. Concrete “first tasks” you can do next

If you want to start coding **right away**, here is a minimal sequence:

1. **Create `computer-use` module in backend**
   - `src/modules/computer-use/computer-use.module.ts`
   - Register in `AppModule` imports.

2. **Add `IntentParserService` + `PlannerService`**
   - Hard‑code a few patterns first (without LLM), e.g.:
     - “bridge all my USDC to solana”
   - Then integrate Claude for more flexible parsing.

3. **Modify `AgentService.chat`**
   - When message looks like an **execution request**, return:
     - `messageType: "plan"`  
     - `plan` object with steps and estimates.

4. **Update dashboard chat UI**
   - When `messageType === "plan"`, render a **plan summary card** + buttons:
     - “Approve Plan (Simulation)”
     - “Cancel”

5. **Add `ExecutorService` (simulation only)**
   - Runs through the plan, generates fake transaction hashes, and updates `StateService`.
   - Returns `executionId` + simulated timeline to the frontend.

After these 5 tasks, you’ll already **see the end‑to‑end “Computer Use” feel** without touching any funds.

---

### 6. About OpenClaw / full desktop control

Your document mentions **OpenClaw / Claude Computer Use** (true OS/browser control).

For XROH:

- **Short term:** focus on the **backend‑tool‑driven agent** (what this guide covers). This already gives:
  - Autonomous bridging
  - Portfolio consolidation
  - Scheduled/conditional operations
- **Later:** you can add a **separate service** that:
  - Runs on a controlled machine  
  - Uses Anthropic’s computer‑use / OpenClaw style stack  
  - For tasks like:
    - Interacting with external DeFi dashboards
    - Doing web research
    - Operating CEX accounts (if ever needed)

Keep those concerns separate so **bridge execution remains deterministic and auditable** inside your Nest backend.

---

### 7. Mental model summary (for quick recall)

- **Today:** Advisor agent → “Main route yeh hai, aap khud execute karo.”
- **Goal:** Computer Use agent → “Plan main banaunga, tx main prepare karunga, aap sirf sign karo.”
- **How in XROH:**
  - Backend:
    - `AiModule` + `computer-use` services = **brain + planner + executor**
  - Frontend:
    - Chat + wallet + status UI = **eyes + hands + confirmations**
  - Blockchain:
    - Existing providers, quotes, routes = **muscles** already present.

Implement **Stage 1–2** first; once that feels smooth and safe, extend to **testnet execution (Stage 3)** and finally to **mainnet pilot**.


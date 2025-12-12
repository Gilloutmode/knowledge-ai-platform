/**
 * Enhanced Health Check Routes
 * Provides detailed system health for monitoring and orchestration
 */

import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";

const healthRouter = new Hono();

// Basic health check - fast, for load balancers
healthRouter.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check - includes dependencies
healthRouter.get("/detailed", async (c) => {
  const startTime = Date.now();
  const isProduction = process.env.NODE_ENV === "production";

  const health: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    environment: string;
    version: string;
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    checks: {
      database: { status: string; latency?: number; error?: string };
      redis?: { status: string; latency?: number; error?: string };
    };
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: isProduction ? "production" : "development",
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    memory: {
      used: 0,
      total: 0,
      percentage: 0,
    },
    checks: {
      database: { status: "unknown" },
    },
  };

  // Memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  };

  // Check Supabase connection
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const dbStart = Date.now();
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Simple query to test connection
      const { error } = await supabase.from("channels").select("id").limit(1);

      if (error) {
        health.checks.database = {
          status: "error",
          latency: Date.now() - dbStart,
          error: error.message,
        };
        health.status = "degraded";
      } else {
        health.checks.database = {
          status: "ok",
          latency: Date.now() - dbStart,
        };
      }
    } catch (err) {
      health.checks.database = {
        status: "error",
        latency: Date.now() - dbStart,
        error: err instanceof Error ? err.message : "Connection failed",
      };
      health.status = "degraded";
    }
  } else {
    health.checks.database = {
      status: "not_configured",
    };
    // In demo mode, this is expected
    if (process.env.ALLOW_DEMO_MODE !== "true" && !isProduction) {
      health.status = "degraded";
    }
  }

  // Check Redis if configured
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    // Redis check would go here when implemented
    health.checks.redis = { status: "not_implemented" };
  }

  // Log health check result
  const totalLatency = Date.now() - startTime;
  if (health.status !== "healthy") {
    logger.warn({ health, latency: totalLatency }, "Health check degraded");
  }

  // Return appropriate status code
  const statusCode =
    health.status === "healthy"
      ? 200
      : health.status === "degraded"
        ? 200
        : 503;

  return c.json(health, statusCode);
});

// Readiness check - for Kubernetes
healthRouter.get("/ready", async (c) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const allowDemo = process.env.ALLOW_DEMO_MODE === "true";
  const isProduction = process.env.NODE_ENV === "production";

  // In production, require database
  // In development, allow demo mode
  if (!supabaseUrl || !supabaseKey) {
    if (isProduction || !allowDemo) {
      return c.json({ ready: false, reason: "Database not configured" }, 503);
    }
    // Demo mode in development
    return c.json({ ready: true, mode: "demo" });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from("channels").select("id").limit(1);

    if (error) {
      return c.json({ ready: false, reason: "Database error" }, 503);
    }

    return c.json({ ready: true });
  } catch {
    return c.json({ ready: false, reason: "Database unreachable" }, 503);
  }
});

// Liveness check - for Kubernetes
healthRouter.get("/live", (c) => {
  // If we can respond, we're alive
  return c.json({ alive: true });
});

export { healthRouter };

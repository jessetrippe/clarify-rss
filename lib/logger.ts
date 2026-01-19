/**
 * Simple logging utility that respects environment
 * Only logs in development mode, silent in production
 */

const isDevelopment = process.env.NODE_ENV === "development";

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

function createLogger(prefix: string): Logger {
  const log = (level: LogLevel, ...args: unknown[]) => {
    // Always log errors
    if (level === "error") {
      console.error(`[${prefix}]`, ...args);
      return;
    }

    // Always log warnings
    if (level === "warn") {
      console.warn(`[${prefix}]`, ...args);
      return;
    }

    // Only log debug/info in development
    if (isDevelopment) {
      if (level === "debug") {
        console.debug(`[${prefix}]`, ...args);
      } else {
        console.log(`[${prefix}]`, ...args);
      }
    }
  };

  return {
    debug: (...args: unknown[]) => log("debug", ...args),
    info: (...args: unknown[]) => log("info", ...args),
    warn: (...args: unknown[]) => log("warn", ...args),
    error: (...args: unknown[]) => log("error", ...args),
  };
}

// Pre-created loggers for common modules
export const syncLogger = createLogger("Sync");
export const feedLogger = createLogger("Feed");
export const uiLogger = createLogger("UI");

// Factory for custom loggers
export { createLogger };

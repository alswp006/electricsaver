import { describe, it, expect, vi, afterEach } from "vitest";
import {
  readJSON,
  writeJSON,
  removeKeys,
  getStorageBytes,
  migrateFlags,
} from "@/lib/storage";
import type { AppFlags } from "@/lib/types";

describe("readJSON", () => {
  it("returns fallback when key is absent", () => {
    const result = readJSON("es:flags", { schemaVersion: 1, disclaimerSeenAt: null });
    expect(result).toEqual({ ok: true, value: { schemaVersion: 1, disclaimerSeenAt: null } });
  });

  it("returns parsed value when JSON is valid", () => {
    localStorage.setItem("es:records", JSON.stringify([{ yearMonth: "2026-01" }]));
    const result = readJSON("es:records", []);
    expect(result).toEqual({ ok: true, value: [{ yearMonth: "2026-01" }] });
  });

  it("resets corrupt value to fallback and reports ok:false, without console.error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("es:records", "{{broken");

    const result = readJSON("es:records", [] as unknown[]);

    expect(result).toEqual({ ok: false, value: [], reason: "corrupt" });
    expect(localStorage.getItem("es:records")).toBe(JSON.stringify([]));
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("writeJSON", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes value and returns ok:true", () => {
    const result = writeJSON("es:profile", { regionCode: "seoul", householdSize: 2 });
    expect(result).toEqual({ ok: true });
    expect(localStorage.getItem("es:profile")).toBe(
      JSON.stringify({ regionCode: "seoul", householdSize: 2 })
    );
  });

  it("returns ok:false reason:quota instead of throwing when setItem throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("quota exceeded");
      err.name = "QuotaExceededError";
      throw err;
    });

    expect(() => writeJSON("es:records", [1, 2, 3])).not.toThrow();
    const result = writeJSON("es:records", [1, 2, 3]);
    expect(result).toEqual({ ok: false, reason: "quota" });
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("removeKeys / getStorageBytes", () => {
  it("removes the given keys", () => {
    localStorage.setItem("es:records", "[]");
    localStorage.setItem("es:profile", "{}");

    removeKeys(["es:records", "es:profile"]);

    expect(localStorage.getItem("es:records")).toBeNull();
    expect(localStorage.getItem("es:profile")).toBeNull();
  });

  it("sums key.length + value.length for es: prefixed keys only, in under 5ms", () => {
    localStorage.setItem("es:records", "abc");
    localStorage.setItem("es:profile", "de");
    localStorage.setItem("other:key", "should-not-count");

    const expected = "es:records".length + "abc".length + "es:profile".length + "de".length;

    const start = performance.now();
    const bytes = getStorageBytes();
    const elapsed = performance.now() - start;

    expect(bytes).toBe(expected);
    expect(elapsed).toBeLessThan(5);
  });
});

describe("migrateFlags", () => {
  it("creates es:flags with schemaVersion 1 when absent, leaving es:records untouched", () => {
    localStorage.setItem("es:records", JSON.stringify([{ yearMonth: "2026-01" }]));

    migrateFlags();

    const flags = JSON.parse(localStorage.getItem("es:flags")!) as AppFlags;
    expect(flags).toEqual({ schemaVersion: 1, disclaimerSeenAt: null });
    const records = JSON.parse(localStorage.getItem("es:records")!);
    expect(records).toHaveLength(1);
  });

  it("resets to schemaVersion 1 when an old/mismatched schema is present", () => {
    localStorage.setItem("es:records", JSON.stringify([{ yearMonth: "2026-01" }, { yearMonth: "2026-02" }]));
    localStorage.setItem("es:flags", JSON.stringify({ schemaVersion: 0, disclaimerSeenAt: "2025-01-01" }));

    migrateFlags();

    const flags = JSON.parse(localStorage.getItem("es:flags")!) as AppFlags;
    expect(flags).toEqual({ schemaVersion: 1, disclaimerSeenAt: null });
    const records = JSON.parse(localStorage.getItem("es:records")!);
    expect(records).toHaveLength(2);
  });

  it("does not call console.error for corrupt es:flags", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("es:flags", "{{broken");

    migrateFlags();

    const flags = JSON.parse(localStorage.getItem("es:flags")!) as AppFlags;
    expect(flags).toEqual({ schemaVersion: 1, disclaimerSeenAt: null });
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

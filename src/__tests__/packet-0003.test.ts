import { describe, it, expect, vi } from "vitest";

/**
 * PACKET 0003: calculateBill 계산 엔진 + CP-6 픽스처 테스트
 *
 * CP-5 알고리즘 8단계를 그대로 구현한 순수 함수 calculateBill(kWh, month): BillBreakdown 을 작성하고
 * CP-6 픽스처 5행 유닛 테스트를 붙인다. 하계(7·8월) 구간표 자동 전환, stage/stageBreakdown 반환,
 * 반올림 순서(fund=floor(subtotal*0.037/10)*10, total=floor((subtotal+vat+fund)/10)*10)를 정확히 지킨다.
 *
 * AC-1.1 [U][P0]: CP-6 5행 각각에서 baseCharge/energyCharge/subtotal/vat/fund/total 6필드가 표 값과 정확히 일치
 *                 (total 1170/23880/71260/60510/127280)
 * AC-1.2 [E][P0]: calculateBill(350,7).total === calculateBill(350,8).total 이고
 *                 350/3 과 350/8 모두 stage===2
 * AC-1.3 [E][P0]: 구간 경계값 계산 (getStage, getNextStageGap)
 * AC-1.4 [S][P0]: calculateBill(500,3).stageBreakdown.length===3 이고
 *                 stageBreakdown[2] === { stage:3, kWh:100, unitPrice:307.3, charge:30730 },
 *                 baseCharge===7300
 * AC-1.5 [W][P1]: 잘못된 입력 방어 (RangeError)
 * AC-1.6 [W][P1]: 상한 초과 사용량 처리
 * AC-1.7 [U][P1]: 성능 및 순수성 (1000회 <50ms, no localStorage/fetch)
 */

describe("Packet 0003: calculateBill 계산 엔진 + CP-6 픽스처 테스트", () => {
  describe("AC-1.1: CP-6 픽스처 5행 전량 일치", () => {
    it("should calculate Row 1: 1kWh in March (stage 1)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(1, 3);

      expect(result.baseCharge).toBe(910);
      expect(result.energyCharge).toBe(120);
      expect(result.subtotal).toBe(1044);
      expect(result.vat).toBe(104);
      expect(result.fund).toBe(30);
      expect(result.total).toBe(1170);
    });

    it("should calculate Row 2: 150kWh in March (stage 1)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(150, 3);

      expect(result.baseCharge).toBe(910);
      expect(result.energyCharge).toBe(18000);
      expect(result.subtotal).toBe(21010);
      expect(result.vat).toBe(2101);
      expect(result.fund).toBe(770);
      expect(result.total).toBe(23880);
    });

    it("should calculate Row 3: 350kWh in March (stage 2)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(350, 3);

      expect(result.baseCharge).toBe(1600);
      expect(result.energyCharge).toBe(56190);
      expect(result.subtotal).toBe(62690);
      expect(result.vat).toBe(6269);
      expect(result.fund).toBe(2310);
      expect(result.total).toBe(71260);
    });

    it("should calculate Row 4: 350kWh in August (summer, stage 2)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(350, 8);

      expect(result.baseCharge).toBe(1600);
      expect(result.energyCharge).toBe(46730);
      expect(result.subtotal).toBe(53230);
      expect(result.vat).toBe(5323);
      expect(result.fund).toBe(1960);
      expect(result.total).toBe(60510);
    });

    it("should calculate Row 5: 500kWh in March (stage 3)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(500, 3);

      expect(result.baseCharge).toBe(7300);
      expect(result.energyCharge).toBe(97650);
      expect(result.subtotal).toBe(111950);
      expect(result.vat).toBe(11195);
      expect(result.fund).toBe(4140);
      expect(result.total).toBe(127280);
    });
  });

  describe("AC-1.2: 하계 완화 구간 자동 적용", () => {
    it("should apply summer rate automatically for month=7", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const july = calculateBill(350, 7);
      const august = calculateBill(350, 8);

      expect(july.total).toBe(60510);
      expect(august.total).toBe(60510);
      expect(july.stage).toBe(2);
      expect(august.stage).toBe(2);
    });

    it("should differ energyCharge between summer and winter for 350kWh", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const march = calculateBill(350, 3);
      const august = calculateBill(350, 8);

      // Summer has lower unit price in stage 2 (214.6 vs ... check spec)
      expect(august.energyCharge).toBeLessThan(march.energyCharge);
      expect(august.total).toBeLessThan(march.total);
    });

    it("should keep same stage for 350kWh in both summer and winter", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const march = calculateBill(350, 3);
      const august = calculateBill(350, 8);

      expect(march.stage).toBe(2);
      expect(august.stage).toBe(2);
    });
  });

  describe("AC-1.3: 구간 경계값 계산 (getStage, getNextStageGap)", () => {
    it("getStage should return correct stage for boundary values in winter", async () => {
      const { getStage } = await import("@/domain/calculateBill");

      expect(getStage(200, 3)).toBe(1);
      expect(getStage(201, 3)).toBe(2);
      expect(getStage(400, 3)).toBe(2);
      expect(getStage(401, 3)).toBe(3);
    });

    it("getStage should return correct stage for boundary values in summer", async () => {
      const { getStage } = await import("@/domain/calculateBill");

      expect(getStage(300, 8)).toBe(1);
      expect(getStage(301, 8)).toBe(2);
      expect(getStage(450, 8)).toBe(2);
      expect(getStage(451, 8)).toBe(3);
    });

    it("getNextStageGap should return gap to next stage", async () => {
      const { getNextStageGap } = await import("@/domain/calculateBill");

      expect(getNextStageGap(180, 3)).toBe(20); // 200 - 180
      expect(getNextStageGap(500, 3)).toBe(0); // already in stage 3 (top stage)
    });

    it("getNextStageGap should work for summer boundary", async () => {
      const { getNextStageGap } = await import("@/domain/calculateBill");

      expect(getNextStageGap(290, 8)).toBe(10); // 300 - 290
      expect(getNextStageGap(350, 8)).toBe(100); // 450 - 350
    });
  });

  describe("AC-1.4: 3구간 진입 시 기본요금 점프", () => {
    it("should have stage 3 data in stageBreakdown for 500kWh", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(500, 3);

      expect(result.stage).toBe(3);
      expect(result.stageBreakdown.length).toBe(3);
    });

    it("should have correct stageBreakdown[2] for stage 3", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(500, 3);
      const stage3 = result.stageBreakdown[2];

      expect(stage3.stage).toBe(3);
      expect(stage3.kWh).toBe(100); // 500 - 400 (first two stages)
      expect(stage3.unitPrice).toBe(307.3);
      expect(stage3.charge).toBe(30730); // 100 * 307.3
    });

    it("should have baseCharge of 7300 for stage 3", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(500, 3);

      expect(result.baseCharge).toBe(7300);
    });

    it("should have correct stageBreakdown for 350kWh (stage 2)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(350, 3);

      expect(result.stageBreakdown.length).toBe(2);
      expect(result.stageBreakdown[0].stage).toBe(1);
      expect(result.stageBreakdown[0].kWh).toBe(200);
      expect(result.stageBreakdown[0].unitPrice).toBe(120.0);
      expect(result.stageBreakdown[0].charge).toBe(24000);

      expect(result.stageBreakdown[1].stage).toBe(2);
      expect(result.stageBreakdown[1].kWh).toBe(150);
      expect(result.stageBreakdown[1].unitPrice).toBe(214.6);
      expect(result.stageBreakdown[1].charge).toBe(32190);
    });
  });

  describe("AC-1.5: 잘못된 입력 방어", () => {
    it("should throw RangeError for negative kWh", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      expect(() => calculateBill(-10, 3)).toThrow(RangeError);
      expect(() => calculateBill(-10, 3)).toThrow("kWh must be 0 or greater");
    });

    it("should throw RangeError for NaN kWh", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      expect(() => calculateBill(NaN, 3)).toThrow(RangeError);
      expect(() => calculateBill(NaN, 3)).toThrow("kWh must be a number");
    });

    it("should throw RangeError for invalid month (13)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      expect(() => calculateBill(100, 13)).toThrow(RangeError);
      expect(() => calculateBill(100, 13)).toThrow("month must be 1-12");
    });

    it("should throw RangeError for month 0", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      expect(() => calculateBill(100, 0)).toThrow(RangeError);
      expect(() => calculateBill(100, 0)).toThrow("month must be 1-12");
    });

    it("should not call console.error on validation failure", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        calculateBill(-10, 3);
      } catch {
        // Expected
      }

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("AC-1.6: 상한 초과 사용량 처리", () => {
    it("should throw RangeError for kWh > 3000", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      expect(() => calculateBill(3001, 3)).toThrow(RangeError);
      expect(() => calculateBill(3001, 3)).toThrow("kWh must be 3000 or less");
    });

    it("should allow calculateBill(3000, 3)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(3000, 3);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(typeof result.total).toBe("number");
      expect(Number.isInteger(result.total)).toBe(true);
    });

    it("should throw on 3001 but not on 3000", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      expect(() => calculateBill(3001, 3)).toThrow();
      expect(() => calculateBill(3000, 3)).not.toThrow();
    });
  });

  describe("AC-1.7: 계산 성능 및 순수성", () => {
    it("should calculate 1000 times in less than 50ms for (350, 8)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        calculateBill(350, 8);
      }

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("should return consistent results for same input (1000 calls)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push(calculateBill(350, 8));
      }

      const first = results[0];
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(first);
      }
    });

    it("should not access localStorage", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

      calculateBill(350, 8);

      expect(getItemSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();

      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    it("should not call fetch", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const fetchSpy = vi.spyOn(global, "fetch" as any);

      calculateBill(350, 8);

      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it("should not reference Date.now() during calculation", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const dateNowSpy = vi.spyOn(Date, "now");

      calculateBill(350, 8);

      expect(dateNowSpy).not.toHaveBeenCalled();

      dateNowSpy.mockRestore();
    });
  });

  describe("Additional: BillBreakdown structure validation", () => {
    it("should return object with all required fields", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(350, 3);

      expect(result).toHaveProperty("baseCharge");
      expect(result).toHaveProperty("energyCharge");
      expect(result).toHaveProperty("subtotal");
      expect(result).toHaveProperty("vat");
      expect(result).toHaveProperty("fund");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("stage");
      expect(result).toHaveProperty("stageBreakdown");
    });

    it("should have stageBreakdown as array of objects with stage/kWh/unitPrice/charge", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(500, 3);

      expect(Array.isArray(result.stageBreakdown)).toBe(true);
      result.stageBreakdown.forEach((item) => {
        expect(item).toHaveProperty("stage");
        expect(item).toHaveProperty("kWh");
        expect(item).toHaveProperty("unitPrice");
        expect(item).toHaveProperty("charge");

        expect(typeof item.stage).toBe("number");
        expect(typeof item.kWh).toBe("number");
        expect(typeof item.unitPrice).toBe("number");
        expect(typeof item.charge).toBe("number");
      });
    });

    it("should have all numeric fields as integers (except unitPrice)", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      const result = calculateBill(350, 3);

      expect(Number.isInteger(result.baseCharge)).toBe(true);
      expect(Number.isInteger(result.energyCharge)).toBe(true);
      expect(Number.isInteger(result.subtotal)).toBe(true);
      expect(Number.isInteger(result.vat)).toBe(true);
      expect(Number.isInteger(result.fund)).toBe(true);
      expect(Number.isInteger(result.total)).toBe(true);

      result.stageBreakdown.forEach((item) => {
        expect(Number.isInteger(item.stage)).toBe(true);
        expect(Number.isInteger(item.kWh)).toBe(true);
        expect(Number.isInteger(item.charge)).toBe(true);
        // unitPrice can be decimal (214.6, 307.3)
      });
    });
  });

  describe("Rounding verification (critical for accuracy)", () => {
    it("energyCharge should use Math.round", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      // For 350kWh in March: (200*120 + 150*214.6) = 24000 + 32190 = 56190
      const result = calculateBill(350, 3);
      expect(result.energyCharge).toBe(56190);
    });

    it("VAT should use Math.round", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      // For 350kWh: subtotal=62690, vat should be Math.round(62690 * 0.1) = Math.round(6269) = 6269
      const result = calculateBill(350, 3);
      expect(result.vat).toBe(6269);
    });

    it("fund should use Math.floor(subtotal * 0.037 / 10) * 10", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      // For 350kWh: subtotal=62690, fund = Math.floor(62690 * 0.037 / 10) * 10
      // = Math.floor(2319.53 / 10) * 10 = Math.floor(231.953) * 10 = 231 * 10 = 2310
      const result = calculateBill(350, 3);
      expect(result.fund).toBe(2310);
    });

    it("total should use Math.floor((subtotal + vat + fund) / 10) * 10", async () => {
      const { calculateBill } = await import("@/domain/calculateBill");

      // For 350kWh: total = Math.floor((62690 + 6269 + 2310) / 10) * 10
      // = Math.floor(71269 / 10) * 10 = Math.floor(7126.9) * 10 = 7126 * 10 = 71260
      const result = calculateBill(350, 3);
      expect(result.total).toBe(71260);
    });
  });
});

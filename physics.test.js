import { describe, it, expect } from "vitest";

// Reference tests for the equations used by app.js. Keep these formulas
// independent from UI rendering so numerical behavior can be regression-tested.
function mirrorImage(u, f) {
  // Positive magnitudes: concave f>0; convex f<0; virtual image v<0.
  const denom = 1 / f - 1 / u;
  return Math.abs(denom) < 1e-12 ? Infinity : 1 / denom;
}
function refractedAngle(n1, n2, incidenceDeg) {
  const s = (n1 / n2) * Math.sin(incidenceDeg * Math.PI / 180);
  if (s > 1 + 1e-12) return null;
  return Math.asin(Math.max(-1, Math.min(1, s))) * 180 / Math.PI;
}
describe("mirror image calculations", () => {
  it("concave mirror: object at 2f forms image at 2f", () => {
    expect(mirrorImage(200, 100)).toBeCloseTo(200, 8);
  });
  it("concave mirror: object beyond C forms image between F and C", () => {
    const v = mirrorImage(300, 100);
    expect(v).toBeCloseTo(150, 8);
    expect(v).toBeGreaterThan(100);
    expect(v).toBeLessThan(200);
  });
  it("concave mirror: object between F and C forms image beyond C", () => {
    const v = mirrorImage(150, 100);
    expect(v).toBeCloseTo(300, 8);
    expect(v).toBeGreaterThan(200);
  });
  it("concave mirror: object inside focus forms virtual image", () => {
    expect(mirrorImage(50, 100)).toBeCloseTo(-100, 8);
  });
  it("convex mirror forms virtual image", () => {
    expect(mirrorImage(200, -100)).toBeCloseTo(-66.6666667, 5);
  });
  it("object at focus has image at infinity", () => {
    expect(mirrorImage(100, 100)).toBe(Infinity);
  });
});
describe("Snell's law", () => {
  it("air to glass at 30 degrees gives about 19.47 degrees", () => {
    expect(refractedAngle(1, 1.5, 30)).toBeCloseTo(19.4712, 3);
  });
  it("glass to air above critical angle gives total internal reflection", () => {
    expect(refractedAngle(1.5, 1, 50)).toBeNull();
  });
  it("normal incidence has zero refraction angle", () => {
    expect(refractedAngle(1, 1.5, 0)).toBeCloseTo(0, 8);
  });
});

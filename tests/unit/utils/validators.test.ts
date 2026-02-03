import { describe, expect, it } from "vitest";
import {
    sanitizeInput,
    validateEmail,
    validateName,
    validateNumber,
    validatePassword,
} from "../../../src/utils/validators";

describe("validators", () => {
    describe("validateEmail", () => {
        it("should return true for valid emails", () => {
            expect(validateEmail("test@example.com")).toBe(true);
            expect(validateEmail("user.name@domain.co.uk")).toBe(true);
        });

        it("should return false for invalid emails", () => {
            expect(validateEmail("test")).toBe(false);
            expect(validateEmail("test@")).toBe(false);
            expect(validateEmail("@example.com")).toBe(false);
            expect(validateEmail("test@example")).toBe(false);
        });
    });

    describe("validatePassword", () => {
        it("should return valid for strong passwords", () => {
            const result = validatePassword("StrongPassword123");
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should return errors for short passwords", () => {
            const result = validatePassword("Short1");
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain("Password must be at least 8 characters long");
        });

        it("should return errors for missing uppercase", () => {
            const result = validatePassword("lowercase123");
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain("Password must contain at least one uppercase letter");
        });

        it("should return errors for missing lowercase", () => {
            const result = validatePassword("UPPERCASE123");
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain("Password must contain at least one lowercase letter");
        });

        it("should return errors for missing number", () => {
            const result = validatePassword("NoNumberPass");
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain("Password must contain at least one number");
        });
    });

    describe("validateName", () => {
        it("should return true for valid names", () => {
            expect(validateName("John Doe")).toBe(true);
        });

        it("should return false for short names", () => {
            expect(validateName("J")).toBe(false);
        });

        it("should return false for very long names", () => {
            expect(validateName("a".repeat(51))).toBe(false);
        });
    });

    describe("validateNumber", () => {
        it("should validate numbers within range", () => {
            expect(validateNumber(10, 0, 20)).toBe(true);
        });

        it("should return false if below min", () => {
            expect(validateNumber(5, 10)).toBe(false);
        });

        it("should return false if above max", () => {
            expect(validateNumber(25, 0, 20)).toBe(false);
        });

        it("should return false for NaN", () => {
            expect(validateNumber(NaN)).toBe(false);
        });
    });

    describe("sanitizeInput", () => {
        it("should trim and remove HTML-like characters", () => {
            expect(sanitizeInput("  <script>alert(1)</script>  ")).toBe("scriptalert(1)/script");
        });
    });
});

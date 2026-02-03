import { describe, expect, it } from "vitest";
import {
    cn,
    formatDate,
    formatDistanceToNow,
    formatFileSize,
    formatNumber,
    formatPercentage,
    formatScientific,
    formatTime,
    truncateText,
} from "../../../src/utils/formatters";

describe("formatters", () => {
    describe("formatDate", () => {
        it("should format a date object correctly", () => {
            const date = new Date("2024-01-01");
            expect(formatDate(date)).toBe("Jan 1, 2024");
        });

        it("should format a date string correctly", () => {
            expect(formatDate("2024-01-01")).toBe("Jan 1, 2024");
        });
    });

    describe("formatTime", () => {
        it("should format time correctly", () => {
            const date = new Date("2024-01-01T12:30:00");
            expect(formatTime(date)).toMatch(/12:30\s(PM|pm)/);
        });
    });

    describe("formatNumber", () => {
        it("should format number with default decimals", () => {
            expect(formatNumber(123.456)).toBe("123.46");
        });

        it("should format number with custom decimals", () => {
            expect(formatNumber(123.456, 1)).toBe("123.5");
        });
    });

    describe("formatScientific", () => {
        it("should format number in scientific notation", () => {
            expect(formatScientific(1234.56)).toBe("1.23e+3");
        });
    });

    describe("formatPercentage", () => {
        it("should format percentage correctly", () => {
            expect(formatPercentage(50, 200)).toBe("25.0%");
        });
    });

    describe("formatFileSize", () => {
        it("should format bytes correctly", () => {
            expect(formatFileSize(500)).toBe("500.00 B");
        });

        it("should format KB correctly", () => {
            expect(formatFileSize(1024 * 1.5)).toBe("1.50 KB");
        });

        it("should format MB correctly", () => {
            expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.50 MB");
        });

        it("should format GB correctly", () => {
            expect(formatFileSize(1024 * 1024 * 1024 * 1.2)).toBe("1.20 GB");
        });
    });

    describe("truncateText", () => {
        it("should truncate long text", () => {
            expect(truncateText("Hello World", 5)).toBe("Hello...");
        });

        it("should not truncate short text", () => {
            expect(truncateText("Hello", 10)).toBe("Hello");
        });
    });

    describe("cn", () => {
        it("should join class names", () => {
            expect(cn("a", "b", "c")).toBe("a b c");
        });

        it("should ignore falsy values", () => {
            expect(cn("a", false, "b", null, undefined, "c")).toBe("a b c");
        });
    });

    describe("formatDistanceToNow", () => {
        it("should return 'just now' for recent dates", () => {
            const recent = new Date();
            expect(formatDistanceToNow(recent)).toBe("just now");
        });

        it("should return minutes ago", () => {
            const minsAgo = new Date(Date.now() - 5 * 60 * 1000);
            expect(formatDistanceToNow(minsAgo)).toBe("5m ago");
        });

        it("should return hours ago", () => {
            const hoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
            expect(formatDistanceToNow(hoursAgo)).toBe("3h ago");
        });

        it("should return days ago", () => {
            const daysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
            expect(formatDistanceToNow(daysAgo)).toBe("4d ago");
        });

        it("should fallback to formatDate for old dates", () => {
            const oldDate = new Date("2020-01-01");
            expect(formatDistanceToNow(oldDate)).toBe("Jan 1, 2020");
        });
    });
});

import { describe, expect, it } from "bun:test";
import {
	DEV_CHAT_MODELS,
	getDesktopChatModelOptions,
	isDesktopChatSessionReady,
	resolveDesktopChatOrganizationId,
} from "./dev-chat";

describe("dev chat helpers", () => {
	it("always resolves to local organization", () => {
		expect(resolveDesktopChatOrganizationId(null, true)).toBe("local");
		expect(resolveDesktopChatOrganizationId("org-123", true)).toBe("local");
		expect(resolveDesktopChatOrganizationId("org-123", false)).toBe("local");
		expect(resolveDesktopChatOrganizationId(null, false)).toBe("local");
	});

	it("treats local session ids as ready in dev mode", () => {
		expect(
			isDesktopChatSessionReady({
				sessionId: "session-123",
				hasPersistedSession: false,
				skipEnvValidation: true,
			}),
		).toBe(true);
		expect(
			isDesktopChatSessionReady({
				sessionId: null,
				hasPersistedSession: false,
				skipEnvValidation: true,
			}),
		).toBe(false);
	});

	it("returns the fallback model list only in dev mode", () => {
		expect(getDesktopChatModelOptions(true)).toEqual(DEV_CHAT_MODELS);
		expect(getDesktopChatModelOptions(false)).toEqual([]);
	});
});

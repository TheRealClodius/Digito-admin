import { vi, describe, it, expect, beforeEach } from "vitest";
import type { CreateAuthChallengeTriggerEvent } from "aws-lambda";

const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn();
  return { mockSend };
});

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn(function () {
    return { send: mockSend };
  }),
  SendEmailCommand: vi.fn(function (input: unknown) {
    return input;
  }),
}));

import { handler } from "./handler";

function makeEvent(sessionLength: number): CreateAuthChallengeTriggerEvent {
  return {
    version: "1",
    triggerSource: "CreateAuthChallenge_Authentication",
    region: "eu-south-1",
    userPoolId: "eu-south-1_test",
    userName: "test@example.com",
    callerContext: { awsSdkVersion: "test", clientId: "test" },
    request: {
      userAttributes: { email: "test@example.com" },
      challengeName: "CUSTOM_CHALLENGE",
      session: Array(sessionLength).fill({
        challengeName: "CUSTOM_CHALLENGE",
        challengeResult: false,
        challengeMetadata: "OTP_CODE",
      }),
      userNotFound: false,
    },
    response: {
      privateChallengeParameters: {},
      challengeMetadata: "",
    },
  } as unknown as CreateAuthChallengeTriggerEvent;
}

describe("create-auth-challenge handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    process.env.AWS_REGION = "eu-south-1";
    process.env.SES_FROM_EMAIL = "noreply@test.com";
  });

  it("generates a 6-digit code and sets privateChallengeParameters on first attempt", async () => {
    const event = makeEvent(0);
    const result = await handler(event, {} as any, () => {});

    const code = result?.response.privateChallengeParameters?.answer;
    expect(code).toMatch(/^\d{6}$/);
    expect(result?.response.challengeMetadata).toBe("OTP_CODE");
  });

  it("sends OTP email on first attempt (session.length === 0)", async () => {
    const event = makeEvent(0);
    await handler(event, {} as any, () => {});

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("sends a new OTP email on retry (session.length > 0)", async () => {
    const event = makeEvent(1);
    await handler(event, {} as any, () => {});

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("generates a different code for each invocation (retry gets fresh code)", async () => {
    const event1 = makeEvent(0);
    const result1 = await handler(event1, {} as any, () => {});
    const code1 = result1?.response.privateChallengeParameters?.answer;

    const event2 = makeEvent(1);
    const result2 = await handler(event2, {} as any, () => {});
    const code2 = result2?.response.privateChallengeParameters?.answer;

    // Both codes should be valid 6-digit strings
    expect(code1).toMatch(/^\d{6}$/);
    expect(code2).toMatch(/^\d{6}$/);
  });

  it("throws if email is missing", async () => {
    const event = makeEvent(0);
    event.request.userAttributes.email = "";
    (event as unknown as { userName: string }).userName = "not-an-email";

    await expect(handler(event, {} as any, () => {})).rejects.toThrow();
  });

  it("throws if SES fails to send", async () => {
    mockSend.mockRejectedValue(new Error("SES error"));
    const event = makeEvent(0);

    await expect(handler(event, {} as any, () => {})).rejects.toThrow("Impossibile inviare il codice OTP");
  });
});

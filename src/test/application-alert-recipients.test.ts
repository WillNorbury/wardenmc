import { describe, expect, it } from "vitest";
import {
  applicationAlertRecipients,
  SKYWARSSMP_APPLICATION_ALERT_DISCORD_ID,
} from "../../supabase/functions/_shared/application-alert-recipients.ts";

describe("application alert recipients", () => {
  it("adds skywars869 for SkywarsSMP applications even when no staff Discord accounts are linked", () => {
    expect(applicationAlertRecipients("skywarssmp", [])).toEqual([
      {
        id: "discord:1384337259108630598",
        discord_id: "1384337259108630598",
      },
    ]);
    expect(SKYWARSSMP_APPLICATION_ALERT_DISCORD_ID).toBe("1384337259108630598");
  });

  it("does not add the SkywarsSMP recipient to other application types", () => {
    expect(applicationAlertRecipients("staff", [])).toEqual([]);
    expect(applicationAlertRecipients("builder", [])).toEqual([]);
  });

  it("keeps existing staff recipients and prevents duplicate Discord DMs", () => {
    const staff = [
      { id: "staff-1", discord_id: "111111111111111111" },
      { id: "skywars869-account", discord_id: SKYWARSSMP_APPLICATION_ALERT_DISCORD_ID },
    ];

    expect(applicationAlertRecipients("skywarssmp", staff)).toEqual(staff);
  });
});

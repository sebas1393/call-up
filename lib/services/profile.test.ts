import {
  decideSetUsername,
  formatPhoneDisplay,
  resolvePostAuthRedirect,
  toProfileDto,
} from "@/lib/services/profile";

describe("formatPhoneDisplay", () => {
  it("formats 10 CO digits", () => {
    expect(formatPhoneDisplay("3102222222")).toBe("+57 310 222 2222");
  });

  it("returns null for invalid phone", () => {
    expect(formatPhoneDisplay(null)).toBeNull();
    expect(formatPhoneDisplay("123")).toBeNull();
  });
});

describe("toProfileDto", () => {
  it("maps row to camelCase profile with isCaller and profileComplete", () => {
    expect(
      toProfileDto({
        id: "u1",
        email: "a@gmail.com",
        name: "Juan Bueno",
        phone: "3102222222",
        user_name: "juanbueno",
        avatar_url: "https://img",
      }),
    ).toEqual({
      id: "u1",
      email: "a@gmail.com",
      name: "Juan Bueno",
      phone: "3102222222",
      phoneDisplay: "+57 310 222 2222",
      userName: "juanbueno",
      avatarUrl: "https://img",
      profileComplete: true,
      isCaller: true,
    });
  });

  it("marks player-only incomplete profile", () => {
    const dto = toProfileDto({
      id: "u2",
      email: "b@gmail.com",
      name: "Pepe",
      phone: null,
      user_name: null,
      avatar_url: null,
    });
    expect(dto.profileComplete).toBe(false);
    expect(dto.isCaller).toBe(false);
  });
});

describe("resolvePostAuthRedirect", () => {
  it("sends incomplete profile to complete-profile", () => {
    expect(
      resolvePostAuthRedirect({
        intent: "caller",
        profileComplete: false,
        hasUserName: false,
      }),
    ).toBe("/complete-profile");
  });

  it("sends caller without username to complete-caller-username", () => {
    expect(
      resolvePostAuthRedirect({
        intent: "caller",
        profileComplete: true,
        hasUserName: false,
      }),
    ).toBe("/complete-caller-username");
  });

  it("honors safe redirectTo, intent routes, and default home", () => {
    expect(
      resolvePostAuthRedirect({
        intent: "player",
        profileComplete: true,
        hasUserName: true,
        redirectTo: "/caller",
      }),
    ).toBe("/caller");
    expect(
      resolvePostAuthRedirect({
        intent: "caller",
        profileComplete: true,
        hasUserName: true,
      }),
    ).toBe("/caller");
    expect(
      resolvePostAuthRedirect({
        intent: "player",
        profileComplete: true,
        hasUserName: false,
      }),
    ).toBe("/player");
    expect(
      resolvePostAuthRedirect({
        intent: null,
        profileComplete: true,
        hasUserName: false,
        redirectTo: "https://evil.example",
      }),
    ).toBe("/");
  });
});

describe("decideSetUsername", () => {
  it("rejects when username already set (immutable)", () => {
    expect(decideSetUsername("oldname", "newname", false)).toEqual({
      ok: false,
      status: 409,
      code: "USERNAME_IMMUTABLE",
      detail: "El usuario del caller ya fue configurado y no se puede cambiar.",
    });
  });

  it("rejects when slug taken by another user", () => {
    expect(decideSetUsername(null, "juanbueno", true)).toEqual({
      ok: false,
      status: 409,
      code: "USERNAME_TAKEN",
      detail: "Ese nombre de usuario ya está en uso.",
    });
  });

  it("accepts first set and builds link", () => {
    expect(decideSetUsername(null, "juanbueno", false)).toEqual({
      ok: true,
      userName: "juanbueno",
      link: "/juanbueno",
    });
  });
});

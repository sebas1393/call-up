import {
  getSupabasePublicEnv,
  getSupabaseServiceEnv,
} from "@/lib/db/env";

describe("getSupabasePublicEnv", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("returns url and anon key when set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";

    expect(getSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-test-key",
    });
  });

  it("throws when public env is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getSupabasePublicEnv()).toThrow(/Missing NEXT_PUBLIC_SUPABASE/);
  });
});

describe("getSupabaseServiceEnv", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("includes service role key from non-public env", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

    expect(getSupabaseServiceEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-test-key",
      serviceRoleKey: "service-role-test-key",
    });
  });

  it("throws when service role key is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseServiceEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

import { urlBase64ToUint8Array } from "@/lib/pwa/subscribe-push";

describe("urlBase64ToUint8Array", () => {
  it("decodes URL-safe base64 VAPID-style keys", () => {
    // "hi" in standard base64 is aGk= ; URL-safe without padding: aGk
    const bytes = urlBase64ToUint8Array("aGk");
    expect(Array.from(bytes)).toEqual([104, 105]);
  });
});

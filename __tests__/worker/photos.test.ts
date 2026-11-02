import { describe, expect, it } from "vitest";
import { PHOTO_PATH, initials, photo } from "@/worker/photos.js";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer;

describe("team photos", () => {
  it("only matches name slugs", () => {
    expect("/team/photos/hailey-anton".match(PHOTO_PATH)?.[1]).toBe("hailey-anton");
    expect("/team/photos/../admin".match(PHOTO_PATH)).toBeNull();
    expect("/team/photos/Hailey".match(PHOTO_PATH)).toBeNull();
    expect("/team/".match(PHOTO_PATH)).toBeNull();
  });

  it("serves the directory headshot", async () => {
    const env = { AUTH: { photo: async (s: string) => (s === "hailey-anton" ? { type: "image/jpeg", data: jpeg } : null) } };
    const r = await photo("hailey-anton", env);
    expect(r.headers.get("content-type")).toBe("image/jpeg");
    expect((await r.arrayBuffer()).byteLength).toBe(4);
  });

  it("falls back to initials when there is no headshot or no directory", async () => {
    const r = await photo("jayden-thinh-to", { AUTH: { photo: async () => null } });
    expect(r.headers.get("content-type")).toBe("image/svg+xml");
    expect(await r.text()).toContain(">JT<");
    expect((await photo("ethan-solnik", {})).headers.get("content-type")).toBe("image/svg+xml");
    expect(initials("cher")).toBe("CH");
  });
});

import { pipeline, hashToObject } from "./_redis.js";
import { DEFAULT_CONFIG } from "../shared/schedule.js";

export async function getConfig() {
  const [h] = await pipeline([["HGETALL", "config"]]);
  return { ...DEFAULT_CONFIG, ...hashToObject(h) };
}

import { pipeline, hashToObject } from "./_redis.js";
import { DEFAULT_CONFIG } from "../shared/schedule.js";

export async function getConfig() {
  const [h] = await pipeline([["HGETALL", "config"]]);
  return { ...DEFAULT_CONFIG, ...hashToObject(h) };
}

import { CATEGORIES as DEFAULT_CATEGORIES } from "../shared/categories.js";

// Lista de categorias: fica no Redis (chave "categories"); se ainda não existir, usa a lista padrão
export async function getCategories() {
  const [raw] = await pipeline([["GET", "categories"]]);
  if (raw) {
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    } catch {}
  }
  return DEFAULT_CATEGORIES;
}

export async function saveCategories(list) {
  await pipeline([["SET", "categories", JSON.stringify(list)]]);
}

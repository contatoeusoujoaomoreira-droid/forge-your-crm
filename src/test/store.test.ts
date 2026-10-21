import { describe, it, expect } from "vitest";
import { unitPrice, cartTotal } from "@/lib/store";

const galao = { id: "1", name: "Detergente 5L", price: 35, wholesale_price: 28, wholesale_min_qty: 5 };

describe("preço atacado x varejo", () => {
  it("abaixo da quantidade mínima cobra varejo", () => expect(unitPrice(galao, 4)).toBe(35));
  it("a partir da quantidade mínima cobra atacado", () => expect(unitPrice(galao, 5)).toBe(28));
  it("total da cesta aplica atacado", () => expect(cartTotal([{ product: galao, qty: 5 }])).toBe(140));
});

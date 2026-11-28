import { describe, it, expect } from "vitest";
import { isCustomerOrder, customerLevel, priorPurchases } from "./StoreCustomers";
describe("clientes", () => {
  it("pedido pago vira cliente", () => expect(isCustomerOrder({ status: "novo", payment_status: "pago" })).toBe(true));
  it("pedido não pago não vira cliente", () => expect(isCustomerOrder({ status: "novo", payment_status: "pendente" })).toBe(false));
  it("cancelado não conta", () => expect(isCustomerOrder({ status: "cancelado", payment_status: "pago" })).toBe(false));
  it("níveis", () => { expect(customerLevel(1, 50)).toBe("Novo"); expect(customerLevel(2, 50)).toBe("Recorrente"); expect(customerLevel(5, 50)).toBe("VIP"); });
  it("mesmo WhatsApp com formatos diferentes já é cliente", () => {
    const all = [{ id: "a", customer_phone: "+55 (11) 98888-7777", payment_status: "pago", status: "novo", created_at: "2026-01-01" }];
    expect(priorPurchases(all, { id: "b", customer_phone: "11988887777", created_at: "2026-02-01" })).toBe(1);
  });
  it("primeira compra é novo cliente", () => expect(priorPurchases([], { id: "b", customer_phone: "11988887777", created_at: "2026-02-01" })).toBe(0));
  it("compra não paga não conta como cliente", () => {
    const all = [{ id: "a", customer_phone: "11988887777", payment_status: "pendente", status: "novo", created_at: "2026-01-01" }];
    expect(priorPurchases(all, { id: "b", customer_phone: "11988887777", created_at: "2026-02-01" })).toBe(0);
  });
});

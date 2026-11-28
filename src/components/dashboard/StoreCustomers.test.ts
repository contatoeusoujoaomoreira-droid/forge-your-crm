import { describe, it, expect } from "vitest";
import { isCustomerOrder, customerLevel } from "./StoreCustomers";
describe("clientes", () => {
  it("pedido pago vira cliente", () => expect(isCustomerOrder({ status: "novo", payment_status: "pago" })).toBe(true));
  it("pedido não pago não vira cliente", () => expect(isCustomerOrder({ status: "novo", payment_status: "pendente" })).toBe(false));
  it("cancelado não conta", () => expect(isCustomerOrder({ status: "cancelado", payment_status: "pago" })).toBe(false));
  it("níveis", () => { expect(customerLevel(1, 50)).toBe("Novo"); expect(customerLevel(2, 50)).toBe("Recorrente"); expect(customerLevel(5, 50)).toBe("VIP"); });
});

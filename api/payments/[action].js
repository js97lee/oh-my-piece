import { createPaymentsHandler } from "../../server/payments.js";
export const config = { maxDuration: 60 };
export default createPaymentsHandler();

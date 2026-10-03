// Where customer payments actually land — shown directly to customers on
// the payment step, so nothing here is secret (unlike the Thunder API
// token, which stays server-only in .env.local).

export const BANK_TRANSFER_ACCOUNT = {
  bankName: "กสิกรไทย",
  bankShort: "KBANK", // must match the `receiver.bank.short` Thunder/EasySlip returns
  accountNumber: "1103275845",
  accountName: "จักรี ศรีบุรินทร์",
};

export const PROMPTPAY_ACCOUNT = {
  mobile: "0969158925",
  accountName: "จักรี ศรีบุรินทร์",
};

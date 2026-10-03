// Generates a PromptPay EMV QR Code payload string — the data that gets
// rendered into a scannable QR image (via the `qrcode` package). Reimplemented
// from the public PromptPay QR spec (Thai Bankers' Association / EMVCo),
// the same approach the popular open-source `promptpay-qr` package uses —
// it's ~50 lines of TLV + CRC16, not worth an extra dependency for.

type Field = { id: string; value: string };

function serialize(fields: Field[]): string {
  return fields
    .map(({ id, value }) => `${id}${value.length.toString().padStart(2, "0")}${value}`)
    .join("");
}

// CRC-16/CCITT-FALSE — the checksum the spec requires in the trailing "63" tag.
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * @param target a Thai mobile number (any formatting) or a 13-digit citizen ID
 * @param amount baht — when set, produces a fixed-amount QR; the customer's
 *   banking app won't let them change it
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const digits = target.replace(/\D/g, "");

  let proxyType: "01" | "02";
  let proxyValue: string;
  if (digits.length === 13) {
    proxyType = "02"; // national ID / tax ID
    proxyValue = digits;
  } else {
    // Mobile number — PromptPay wants "0066" + the number with its leading 0 dropped.
    const local = digits.startsWith("66") ? digits.slice(2) : digits.replace(/^0/, "");
    proxyType = "01";
    proxyValue = `0066${local}`;
  }

  const merchantInfo = serialize([
    { id: "00", value: "A000000677010111" }, // PromptPay Application ID
    { id: proxyType, value: proxyValue },
  ]);

  const fields: Field[] = [
    { id: "00", value: "01" }, // Payload Format Indicator
    { id: "01", value: amount ? "12" : "11" }, // Point of Initiation: dynamic vs static
    { id: "29", value: merchantInfo },
    { id: "53", value: "764" }, // Transaction Currency: THB
    ...(amount ? [{ id: "54", value: amount.toFixed(2) }] : []),
    { id: "58", value: "TH" }, // Country Code
  ];

  const withoutCrc = `${serialize(fields)}6304`;
  return withoutCrc + crc16(withoutCrc);
}

// Convert a numeric amount to English words for NGN (e.g. "TWO MILLION NAIRA, FIFTY KOBO").
export function amountToWords(n: number): string {
  if (!isFinite(n)) return "";
  const negative = n < 0; n = Math.abs(n);
  const naira = Math.floor(n);
  const kobo = Math.round((n - naira) * 100);
  const ones = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
  const tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
  const sub1000 = (x: number): string => {
    if (x === 0) return "";
    if (x < 20) return ones[x];
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? "-" + ones[x % 10] : "");
    return ones[Math.floor(x / 100)] + " hundred" + (x % 100 ? " and " + sub1000(x % 100) : "");
  };
  const scales = ["", "thousand", "million", "billion", "trillion"];
  const toWords = (x: number): string => {
    if (x === 0) return "zero";
    const parts: string[] = []; let i = 0;
    while (x > 0) {
      const chunk = x % 1000;
      if (chunk) parts.unshift(sub1000(chunk) + (scales[i] ? " " + scales[i] : ""));
      x = Math.floor(x / 1000); i++;
    }
    return parts.join(", ");
  };
  const main = `${toWords(naira)} naira`;
  const k = kobo > 0 ? `, ${toWords(kobo)} kobo` : "";
  return `${negative ? "minus " : ""}${main}${k}`.toUpperCase();
}
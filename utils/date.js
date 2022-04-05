export function formatDateToMaskedString({ date, mask }) {
  return mask
    .replace("YYYY", date.getFullYear())
    .replace("MM", date.getMonth())
    .replace("DD", date.getDate())
    .replace("hh", date.getHours())
    .replace("mm", date.getMinutes())
    .replace("ss", date.getSeconds());
}

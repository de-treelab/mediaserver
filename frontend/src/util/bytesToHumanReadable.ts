const suffixes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

export const bytesToHumanReadable = (
  bytes: number,
  multiplier = 1024,
  decimals = 2,
): string => {
  if (bytes === 0) return "0 B";

  const i = Math.floor(Math.log(bytes) / Math.log(multiplier));
  const value = bytes / Math.pow(multiplier, i);

  return `${value.toFixed(decimals)} ${suffixes[i]}`;
};

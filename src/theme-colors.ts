function colorChannels(color: string) {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const value = hex[1].length === 3 ? hex[1].split("").map((part) => part + part).join("") : hex[1];
    return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
  }
  const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

export function darkThemeColor(value: string, role: "background" | "border" | "text" | "shadow"): string {
  const channels = colorChannels(value);
  if (!channels) return value;
  const [red, green, blue] = channels.map((channel) => channel / 255);
  const linear = (channel: number) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);

  if (role === "background" && luminance > 0.68) return chroma > 0.24 ? "#382F2C" : luminance > 0.9 ? "#18272C" : "#233439";
  if (role === "border" && luminance > 0.48) return "#304247";
  if (role === "text" && chroma < 0.16) return luminance < 0.1 ? "#F4F6F3" : luminance < 0.62 ? "#A7B3B4" : value;
  if (role === "shadow" && luminance > 0.55) return "#000000";
  return value;
}

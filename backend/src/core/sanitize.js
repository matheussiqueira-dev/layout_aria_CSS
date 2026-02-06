function normalizeSpaces(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, "");
}

function sanitizeText(value, maxLength = 160) {
  const normalized = normalizeSpaces(stripHtml(value || ""));
  return normalized.slice(0, maxLength);
}

function sanitizeMultilineText(value, maxLength = 800) {
  const raw = stripHtml(value || "");
  const cleaned = raw
    .split("\n")
    .map((line) => normalizeSpaces(line))
    .filter(Boolean)
    .join("\n");

  return cleaned.slice(0, maxLength);
}

function sanitizeTags(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique = new Set();

  for (const tag of input) {
    const sanitized = sanitizeText(tag, 24)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

    if (sanitized) {
      unique.add(sanitized);
    }

    if (unique.size >= 8) {
      break;
    }
  }

  return Array.from(unique);
}

module.exports = {
  sanitizeText,
  sanitizeMultilineText,
  sanitizeTags,
};

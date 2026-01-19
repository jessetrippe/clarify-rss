export function parseCursor(cursor: string): { updatedAt: number; id: string } {
  if (!cursor) {
    return { updatedAt: 0, id: "" };
  }

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (typeof parsed.t === "number" && typeof parsed.i === "string") {
      return { updatedAt: parsed.t, id: parsed.i };
    }
  } catch {
    // Fallback to legacy format below
  }

  const separatorIndex = cursor.indexOf(":");
  if (separatorIndex !== -1) {
    const updatedAtPart = cursor.slice(0, separatorIndex);
    const idPart = cursor.slice(separatorIndex + 1);
    const updatedAt = Number.parseInt(updatedAtPart, 10);
    return {
      updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
      id: idPart ? decodeURIComponent(idPart) : "",
    };
  }

  const updatedAt = Number.parseInt(cursor, 10);
  return {
    updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
    id: "",
  };
}

export function cursorFromRow(updatedAt: number, id: string): string {
  const payload = JSON.stringify({ t: updatedAt, i: id });
  return Buffer.from(payload, "utf8").toString("base64");
}

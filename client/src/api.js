// Thin fetch wrapper. Throws an Error with .status and .code so screens can react
// to AUTH_REQUIRED, PHONE_REQUIRED and RATE_LIMITED.
async function request(path, { method = "GET", json, form } = {}) {
  const options = { method, credentials: "same-origin", headers: {} };

  if (json) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(json);
  } else if (form) {
    options.body = form;
  }

  const response = await fetch(`/api${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong");
    error.status = response.status;
    error.code = data.code;
    error.fields = data.fields;
    throw error;
  }

  return data;
}

export const api = {
  me: () => request("/me"),
  savePhone: (phoneNumber) => request("/me", { method: "PATCH", json: { phoneNumber } }),
  logout: () => request("/logout", { method: "POST" }),
  myItems: () => request("/me/items"),

  items: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
    );
    return request(`/items?${query}`);
  },
  item: (type, id) => request(`/items/${type}/${id}`),
  createItem: (type, form) => request(`/items/${type}`, { method: "POST", form }),
  matches: (id) => request(`/items/lost/${id}/matches`),

  createClaim: (foundId, message, lostItemId) =>
    request(`/items/found/${foundId}/claims`, { method: "POST", json: { message, lostItemId } }),
  claims: () => request("/claims"),
  decideClaim: (id, action) => request(`/claims/${id}`, { method: "PATCH", json: { action } }),
};

export const CATEGORIES = ["Wallet", "Phone", "Keys", "Bag", "Laptop", "Watch", "Documents", "Other"];

// "No. 0417": a stable 4-digit number derived from the id, so a report keeps its number.
export function tagNumber(id) {
  return String(parseInt(id.slice(-6), 16) % 10000).padStart(4, "0");
}

export function timeAgo(value) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  const units = [
    ["y", 31536000],
    ["mo", 2592000],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];

  for (const [label, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }

  return "just now";
}

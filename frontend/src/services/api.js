export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function post(url, body) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    // Check if the response is unauthorized (401)
    if (res.status === 401) {
      return { success: false, message: "Unauthorized", status: 401 };
    }

    return await res.json();
  } catch (error) {
    console.error("API POST error:", error);
    return { success: false, message: "Network error" };
  }
}

export async function get(url) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (res.status === 401) {
      return { success: false, message: "Unauthorized", status: 401 };
    }

    return await res.json();
  } catch (error) {
    console.error("API GET error:", error);
    return { success: false, message: "Network error" };
  }
}

export async function put(url, body) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (res.status === 401) {
      return { success: false, message: "Unauthorized", status: 401 };
    }

    return await res.json();
  } catch (error) {
    console.error("API PUT error:", error);
    return { success: false, message: "Network error" };
  }
}

export async function patch(url, body) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (res.status === 401) {
      return { success: false, message: "Unauthorized", status: 401 };
    }

    return await res.json();
  } catch (error) {
    console.error("API PATCH error:", error);
    return { success: false, message: "Network error" };
  }
}

export async function del(url) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (res.status === 401) {
      return { success: false, message: "Unauthorized", status: 401 };
    }

    return await res.json();
  } catch (error) {
    console.error("API DELETE error:", error);
    return { success: false, message: "Network error" };
  }
}
export async function postFile(url, formData) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      body: formData,
      credentials: "include",
      // Note: Don't set Content-Type header when using FormData
    });

    if (res.status === 401) {
      return { success: false, message: "Unauthorized", status: 401 };
    }

    return await res.json();
  } catch (error) {
    console.error("API POST FILE error:", error);
    return { success: false, message: "Network error" };
  }
}

import React, { createContext, useContext, useState, useEffect } from "react";
import { post, get } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const data = await get("/api/auth/me");
        if (data.success) {
          setUser(data.user);
        } else if (data.status === 401) {
          // Explicitly clear user if 401
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await post("/api/auth/login", { email, password });
      if (data.success) {
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  };

  const signup = async (userData) => {
    try {
      const data = await post("/api/auth/register", userData);
      if (data.success) {
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  };

  const logout = async () => {
    try {
      await post("/api/auth/logout", {});
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateUser = async () => {
    try {
      const data = await get("/api/auth/me");
      if (data.success) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Update user state failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserRole = "citizen" | "nagarsevak" | "super_admin";

export interface User {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;

  ward?: string;
  wardCode?: string | null;
  wardNumber?: string;

  isSuperAdmin?: boolean;

  age?: number;
  email?: string;
  address?: string;
  nagarsevakId?: string;
  avatarColor?: string;
  createdAt?: string;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  profilePhoto?: string;
  wardChanged?: boolean;

  officeAddress?: string;
  residenceAddress?: string;
  officeTimings?: string;
  contactName?: string;
  contactNumber?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;

  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;

  checkPhone: (mobile: string) => Promise<User | null>;

  register: (
    userData: Omit<User, "id" | "avatarColor" | "createdAt">,
  ) => Promise<User>;

  loginWithPhone: (mobile: string) => Promise<User | null>;

  loginWithNagarsevakId: (
    mobile: string,
    nagarsevakId: string,
  ) => Promise<User | null>;

  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "janseva_user";
const USERS_KEY = "janseva_users";

const AVATAR_COLORS = [
  "#1E40AF",
  "#059669",
  "#7C3AED",
  "#D97706",
  "#DC2626",
  "#0EA5E9",
];

function normalizeMobile(mobile: string): string {
  return mobile.trim().replace(/\D/g, "");
}

function getApiBase(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL || "";
}

async function getAllUsers(): Promise<User[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveAllUsers(users: User[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function fetchOfficerFromBackend(mobile: string): Promise<User | null> {
  try {
    const baseUrl = getApiBase();

    if (!baseUrl) {
      return null;
    }

    const response = await fetch(`${baseUrl}/api/auth/login-phone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile: normalizeMobile(mobile),
      }),
    });

    const data = await response.json();

    if (!data.success || !data.user) {
      return null;
    }

    return {
      ...data.user,
      mobile: normalizeMobile(data.user.mobile),
      avatarColor: data.user.isSuperAdmin ? "#16A34A" : "#059669",
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.log("Backend officer login failed:", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((stored) => {
        if (stored) {
          setUser(JSON.parse(stored));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (userData: User) => {
    setUser(userData);

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);

    await AsyncStorage.removeItem(SESSION_KEY);
  };

  const checkPhone = async (mobile: string): Promise<User | null> => {
    const normalized = normalizeMobile(mobile);

    const users = await getAllUsers();

    return users.find((u) => normalizeMobile(u.mobile) === normalized) ?? null;
  };

  const register = async (
    userData: Omit<User, "id" | "avatarColor" | "createdAt">,
  ): Promise<User> => {
    const users = await getAllUsers();

    const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);

    const normalizedMobile = normalizeMobile(userData.mobile);

    const existingIndex = users.findIndex(
      (u) => normalizeMobile(u.mobile) === normalizedMobile,
    );

    const newUser: User = {
      ...userData,

      mobile: normalizedMobile,

      role: userData.role || "citizen",

      wardCode: userData.wardCode ?? null,

      isSuperAdmin: userData.isSuperAdmin || false,

      id: existingIndex >= 0 ? users[existingIndex].id : "U" + Date.now(),

      avatarColor:
        existingIndex >= 0
          ? users[existingIndex].avatarColor
          : AVATAR_COLORS[colorIndex],

      createdAt:
        existingIndex >= 0
          ? users[existingIndex].createdAt
          : new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = newUser;
    } else {
      users.push(newUser);
    }

    await saveAllUsers(users);

    await login(newUser);

    return newUser;
  };

  const loginWithPhone = async (mobile: string): Promise<User | null> => {
    const normalizedMobile = normalizeMobile(mobile);

    const officerUser = await fetchOfficerFromBackend(normalizedMobile);

    if (officerUser) {
      await login(officerUser);

      return officerUser;
    }

    const users = await getAllUsers();

    const existingUser = users.find(
      (u) => normalizeMobile(u.mobile) === normalizedMobile,
    );

    if (existingUser) {
      await login(existingUser);

      return existingUser;
    }

    return null;
  };

  const loginWithNagarsevakId = async (
    mobile: string,
    _nagarsevakId: string,
  ): Promise<User | null> => {
    return loginWithPhone(mobile);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updated: User = {
      ...user,
      ...updates,

      id: user.id,

      role: updates.role || user.role,

      nagarsevakId: updates.nagarsevakId ?? user.nagarsevakId,

      createdAt: user.createdAt,

      wardCode: updates.wardCode ?? user.wardCode ?? null,

      isSuperAdmin: updates.isSuperAdmin ?? user.isSuperAdmin ?? false,
    };

    setUser(updated);

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));

    const users = await getAllUsers();

    const idx = users.findIndex((u) => u.id === user.id);

    if (idx >= 0) {
      users[idx] = updated;
    } else {
      users.push(updated);
    }

    await saveAllUsers(users);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        loading,

        login,
        logout,

        checkPhone,

        register,

        loginWithPhone,

        loginWithNagarsevakId,

        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be inside AuthProvider");
  }

  return ctx;
}

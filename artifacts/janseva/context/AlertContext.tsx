import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AlertType = "alert" | "news";
export type AlertPriority = "normal" | "important" | "urgent";

export interface AlertMedia {
  uri: string;
  type: "image" | "video";
  fileName?: string;
  mimeType?: string;
  duration?: number;
}

export interface AppAlert {
  id: string;
  title: string;
  body: string;
  type: AlertType;
  category?: string;
  priority?: AlertPriority;
  location?: string;
  validUntil?: string;
  targetAudience?: string;
  media?: AlertMedia | null;
  createdAt: string;
  postedBy: string;
}

export type AlertDraft = Pick<AppAlert, "title" | "body" | "type"> & Partial<Pick<AppAlert, "category" | "priority" | "location" | "validUntil" | "targetAudience" | "media">>;

interface AlertContextType {
  alerts: AppAlert[];
  addAlert: (data: AlertDraft, postedBy: string) => void;
  removeAlert: (id: string) => void;
  loading: boolean;
}

const AlertContext = createContext<AlertContextType | null>(null);

const STORAGE_KEY = "connectt_alerts_v1";

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setAlerts(JSON.parse(stored));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = (updated: AppAlert[]) => {
    setAlerts(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const addAlert = (data: AlertDraft, postedBy: string) => {
    const newAlert: AppAlert = {
      ...data,
      priority: data.priority || "normal",
      media: data.media || null,
      id: "ALT" + Date.now().toString().slice(-6),
      createdAt: new Date().toISOString(),
      postedBy,
    };
    save([newAlert, ...alerts]);
  };

  const removeAlert = (id: string) => {
    save(alerts.filter((a) => a.id !== id));
  };

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert, loading }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used inside AlertProvider");
  return ctx;
}

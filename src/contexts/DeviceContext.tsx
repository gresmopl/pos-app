import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/db";
import type { DeviceRegistration } from "@/lib/types";

const DEVICE_ID_KEY = "formen_device_id";

interface DeviceContextValue {
  deviceId: string;
  device: DeviceRegistration | null;
  status: "loading" | "unregistered" | "pending" | "approved" | "blocked";
  register: (
    name: string,
    type: DeviceRegistration["deviceType"],
    employeeId?: string
  ) => Promise<void>;
  refetch: () => void;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function DeviceProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [deviceId] = useState(getOrCreateDeviceId);
  const [device, setDevice] = useState<DeviceRegistration | null>(null);
  const [status, setStatus] = useState<DeviceContextValue["status"]>("loading");
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function check(): Promise<void> {
      try {
        const reg = await db.devices.getByDeviceId(deviceId);
        if (cancelled) return;

        if (!reg) {
          setDevice(null);
          setStatus("unregistered");
        } else {
          setDevice(reg);
          setStatus(reg.status);
          // Update last seen silently
          db.devices.updateLastSeen(deviceId).catch(() => {});
        }
      } catch {
        if (!cancelled) setStatus("unregistered");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [deviceId, trigger]);

  const register = useCallback(
    async (name: string, type: DeviceRegistration["deviceType"], employeeId?: string) => {
      const reg = await db.devices.register({
        deviceId,
        deviceName: name,
        deviceType: type,
        employeeId,
      });
      setDevice(reg);
      setStatus(reg.status);
    },
    [deviceId]
  );

  return (
    <DeviceContext.Provider value={{ deviceId, device, status, register, refetch }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevice must be used within DeviceProvider");
  return ctx;
}

interface DeviceRole {
  isAdmin: boolean;
  isStation: boolean;
  isPersonal: boolean;
  lockedEmployeeId: string | null;
}

export function useDeviceRole(): DeviceRole {
  const { device } = useDevice();
  return {
    isAdmin: device?.deviceType === "admin",
    isStation: device?.deviceType === "station",
    isPersonal: device?.deviceType === "personal",
    lockedEmployeeId: device?.deviceType === "personal" ? (device.employeeId ?? null) : null,
  };
}

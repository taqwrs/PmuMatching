"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AlertContext = createContext(null);

const ALERT_CLASSES = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  error: "alert-error",
};

function AlertIcon({ type }) {
  if (type === "success") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 stroke-current" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M12 22a10 10 0 110-20 10 10 0 010 20z" />
      </svg>
    );
  }

  if (type === "warning") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 stroke-current" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  }

  if (type === "error") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 stroke-current" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M12 22a10 10 0 110-20 10 10 0 010 20z" />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 stroke-current" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function AppAlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);

  const dismissAlert = useCallback((id) => {
    setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== id));
  }, []);

  const showAlert = useCallback((message, options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const alert = {
      id,
      message,
      type: options.type || "info",
    };

    setAlerts((currentAlerts) => [alert, ...currentAlerts].slice(0, 4));

    window.setTimeout(() => {
      dismissAlert(id);
    }, options.duration || 4500);
  }, [dismissAlert]);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div className="fixed left-3 right-3 top-3 z-1000 flex flex-col gap-2 sm:left-auto sm:right-4 sm:top-4 sm:w-1/2 lg:w-1/3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            role="alert"
            className={`alert ${ALERT_CLASSES[alert.type] || ALERT_CLASSES.info} items-start rounded-xl border shadow-xl shadow-base-content/10`}
          >
            <AlertIcon type={alert.type} />
            <span className="min-w-0 flex-1 text-sm leading-snug">{alert.message}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs h-6 min-h-0 w-6 shrink-0 p-0"
              aria-label="ปิดการแจ้งเตือน"
              onClick={() => dismissAlert(alert.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error("useAppAlert must be used inside AppAlertProvider");
  }

  return context;
}

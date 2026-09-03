"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptOptions = {
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
};

type AlertOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "info" | "warning" | "error";
};

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  alert: (options: AlertOptions) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function PlatformDialogProvider({ children }: { children: ReactNode }) {
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  const promptResolver = useRef<((value: string | null) => void) | null>(null);
  const alertResolver = useRef<(() => void) | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [promptState, setPromptState] = useState<PromptOptions | null>(null);
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      promptResolver.current = resolve;
      setPromptValue(options.defaultValue ?? "");
      setPromptState(options);
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      alertResolver.current = resolve;
      setAlertState(options);
    });
  }, []);

  function closeConfirm(result: boolean) {
    setConfirmState(null);
    confirmResolver.current?.(result);
    confirmResolver.current = null;
  }

  function closePrompt(result: string | null) {
    setPromptState(null);
    promptResolver.current?.(result);
    promptResolver.current = null;
  }

  function closeAlert() {
    setAlertState(null);
    alertResolver.current?.();
    alertResolver.current = null;
  }

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}

      <ModalShell
        open={confirmState != null}
        onClose={() => closeConfirm(false)}
        panelClassName="max-w-md"
        ariaLabel={confirmState?.title ?? "Confirm"}
      >
        {confirmState ? (
          <>
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {confirmState.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {confirmState.message}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <Button variant="secondary" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={confirmState.destructive ? "danger" : "primary"}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </>
        ) : null}
      </ModalShell>

      <ModalShell
        open={promptState != null}
        onClose={() => closePrompt(null)}
        panelClassName="max-w-md"
        ariaLabel={promptState?.title ?? "Prompt"}
      >
        {promptState ? (
          <>
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {promptState.title}
              </h2>
              {promptState.message ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {promptState.message}
                </p>
              ) : null}
            </div>
            <div className="px-5 py-4">
              <TextField
                label={promptState.label ?? "Value"}
                name="prompt_value"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
              <Button variant="secondary" onClick={() => closePrompt(null)}>
                Cancel
              </Button>
              <Button onClick={() => closePrompt(promptValue)}>
                {promptState.confirmLabel ?? "Save"}
              </Button>
            </div>
          </>
        ) : null}
      </ModalShell>

      <ModalShell
        open={alertState != null}
        onClose={closeAlert}
        panelClassName="max-w-md"
        ariaLabel={alertState?.title ?? "Notice"}
      >
        {alertState ? (
          <>
            <div
              className={`border-b px-5 py-4 ${
                alertState.variant === "error"
                  ? "border-[var(--danger)]/30 bg-[var(--danger-muted)]"
                  : alertState.variant === "warning"
                    ? "border-[var(--warning)]/30 bg-[var(--warning)]/10"
                    : "border-[var(--border)]"
              }`}
            >
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {alertState.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {alertState.message}
              </p>
            </div>
            <div className="flex justify-end px-5 py-4">
              <Button onClick={closeAlert}>
                {alertState.confirmLabel ?? "OK"}
              </Button>
            </div>
          </>
        ) : null}
      </ModalShell>
    </DialogContext.Provider>
  );
}

export function usePlatformDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("usePlatformDialog must be used within PlatformDialogProvider");
  }
  return ctx;
}

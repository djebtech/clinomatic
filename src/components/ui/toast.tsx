"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & {
    variant?: "default" | "success" | "destructive";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0",
      "data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full",
      {
        "bg-white border-gray-200 text-gray-900": variant === "default",
        "bg-green-50 border-green-200 text-green-900": variant === "success",
        "bg-red-50 border-red-200 text-red-900": variant === "destructive",
      },
      className
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn("text-xs opacity-80", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

const ToastClose = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn("rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity", className)}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose };

// ── Simple imperative toast hook ──────────────────────────────────────────────

type ToastData = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
};

type ToastListener = (toasts: ToastData[]) => void;

let toasts: ToastData[] = [];
const listeners: ToastListener[] = [];

function emit() {
  listeners.forEach((l) => l([...toasts]));
}

export function toast(data: Omit<ToastData, "id">) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...data, id }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export function useToasts() {
  const [list, setList] = React.useState<ToastData[]>([]);
  React.useEffect(() => {
    setList([...toasts]);
    listeners.push(setList);
    return () => {
      const idx = listeners.indexOf(setList);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);
  return list;
}

// ── Toaster component (add to layout) ────────────────────────────────────────
export function Toaster() {
  const list = useToasts();
  return (
    <ToastProvider>
      {list.map((t) => (
        <Toast key={t.id} variant={t.variant}>
          <div className="flex-1 min-w-0">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

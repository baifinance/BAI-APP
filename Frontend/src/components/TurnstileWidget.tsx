/**
 * TurnstileWidget — Cloudflare Turnstile, explicit rendering for Next.js SPA.
 * Managed mode (invisible unless suspicious). Reports token via onToken;
 * parent resets via ref after each submit (tokens are single-use).
 */

"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetRef {
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  size?: "normal" | "compact" | "flexible";
}

const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  function TurnstileWidget({ siteKey, onToken, onExpire, onError, size = "normal" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const renderWidget = useCallback(() => {
      if (!containerRef.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onExpireRef.current?.(),
        "error-callback": () => onErrorRef.current?.(),
      });
    }, [siteKey, size]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetId.current && window.turnstile) {
          window.turnstile.reset(widgetId.current);
        }
      },
    }));

    useEffect(() => {
      renderWidget();
      return () => {
        if (widgetId.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetId.current);
          } catch {
            /* already removed */
          }
          widgetId.current = null;
        }
      };
    }, [renderWidget]);

    if (!siteKey) return null;

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={renderWidget}
        />
        <div className="flex justify-start">
          <div ref={containerRef} className="origin-left scale-[0.85] -my-[5px] -ml-1" />
        </div>
      </>
    );
  }
);

export default TurnstileWidget;

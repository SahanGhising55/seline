"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, AlertCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const t = useTranslations("login");
  const tc = useTranslations("common");

  // Check if already authenticated or no users exist
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/verify");
        const data = await res.json();

        if (data.authenticated) {
          router.replace("/");
        } else if (data.noUsers) {
          // No users exist, redirect to signup
          router.replace("/signup");
        }
      } catch {
        // Ignore errors, just show login form
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("error"));
        setLoading(false);
        return;
      }

      // Success - redirect to home
      router.push("/");
      router.refresh();
    } catch {
      setError(tc("error"));
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="size-6 animate-spin text-terminal-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight font-mono text-terminal-dark">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-terminal-muted font-mono">
          {t("subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            <AlertCircleIcon className="size-4 flex-shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="font-mono text-terminal-dark">
            {tc("email")}
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("placeholderEmail")}
            required
            disabled={loading}
            className="font-mono bg-terminal-cream border-terminal-border focus:border-terminal-green focus:ring-terminal-green"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="font-mono text-terminal-dark">
            {tc("password")}
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("placeholderPassword")}
            required
            disabled={loading}
            className="font-mono bg-terminal-cream border-terminal-border focus:border-terminal-green focus:ring-terminal-green"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full font-mono bg-terminal-green hover:bg-terminal-green/90 text-terminal-cream"
        >
          {loading ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              {t("signingIn")}
            </>
          ) : (
            t("signIn")
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-terminal-muted font-mono">
          {t("cta")}{" "}
          <Link
            href="/signup"
            className="text-terminal-green hover:text-terminal-green/80 font-medium"
          >
            {t("ctaLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

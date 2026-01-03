"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const router = useRouter();
  const t = useTranslations("signup");
  const tc = useTranslations("common");

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/verify");
        const data = await res.json();

        if (data.authenticated) {
          router.replace("/");
        } else if (data.noUsers) {
          setIsFirstUser(true);
        }
      } catch {
        // Ignore errors, just show signup form
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return t("errorPasswordLength");
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(t("errorPasswordMatch"));
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errorShort"));
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
          {isFirstUser ? t("titleFirst") : t("title")}
        </h1>
        <p className="mt-2 text-sm text-terminal-muted font-mono">
          {isFirstUser ? t("subtitleFirst") : t("subtitle")}
        </p>
      </div>

      {isFirstUser && (
        <div className="flex items-center gap-2 p-3 text-sm text-terminal-green bg-green-50 rounded-md border border-green-200">
          <CheckCircleIcon className="size-4 flex-shrink-0" />
          <span className="font-mono">{t("firstUser")}</span>
        </div>
      )}

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
          <p className="text-xs text-terminal-muted font-mono">{t("passwordHint")}</p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="confirmPassword"
            className="font-mono text-terminal-dark"
          >
            {tc("confirmPassword")}
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
              {t("creating")}
            </>
          ) : (
            t("create")
          )}
        </Button>
      </form>

        {!isFirstUser && (
        <div className="text-center">
          <p className="text-sm text-terminal-muted font-mono">
            {t("cta")}{" "}
            <Link
              href="/login"
              className="text-terminal-green hover:text-terminal-green/80 font-medium"
            >
              {t("ctaLink")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

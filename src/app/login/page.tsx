"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithGoogle, verifyPermissions, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

const BACKGROUND_IMAGES = [
  "/backgrounds/star-gazing-005.png",
  "/backgrounds/orange-big.png",
];

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 10000); // 6 seconds visible + 4 seconds transition

    return () => clearInterval(interval);
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      const { role } = await verifyPermissions(user);

      if (!role) {
        await signOut();
        router.push("/unauthorized");
        return;
      }

      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Google sign-in failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 animate-fade-in-delayed">
        {BACKGROUND_IMAGES.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt={`Background ${index + 1}`}
            fill
            className="object-cover transition-opacity duration-[4000ms] ease-in-out"
            style={{
              opacity: currentImageIndex === index ? 1 : 0,
            }}
            priority={index === 0}
            unoptimized
          />
        ))}
      </div>
      <div
        data-testid="background-mask"
        className="absolute inset-0 -z-[9] bg-white/75 dark:bg-transparent"
      />
      <div className="flex items-center justify-center h-full px-8">
        <div className="w-full max-w-[450px] rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg px-8 pb-12 pt-20 animate-in slide-in-from-bottom-2 fade-in duration-700">
          <div className="space-y-16">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-700">
                <Image
                  src="/digito-logo.svg"
                  alt="Digito logo"
                  width={60}
                  height={60}
                />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold">{t("login.title")}</h1>
                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                  {t("login.subtitle")}
                </p>
              </div>
            </div>
            <div className="space-y-3 max-w-xs mx-auto">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {loading ? t("login.signingIn") : t("login.signInWithGoogle")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                {t("login.loginWithSSO")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                {t("login.connectWithMagicLink")}
              </Button>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

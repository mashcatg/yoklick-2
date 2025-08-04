"use client";

import React, { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { storeUserDataForRedirect } from "@/app/lib/authUtils";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

type Mode = "signin" | "signup" | "forgot";

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/10">
    {children}
  </div>
);

export default function AuthForm({ mode = "signin" }: { mode?: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate terms agreement for signup
    if (mode === "signup" && !agreeToTerms) {
      setError("You must agree to our Terms & Conditions and Privacy Policy to continue.");
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) setError(error.message);
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          document.cookie = `sb-access-token=${session.access_token}; path=/`;
          // Store user data for potential redirects
          storeUserDataForRedirect(session.user.id, session.user.email || '');
        }
        router.push("/");
      }
    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) setError(error.message);
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          document.cookie = `sb-access-token=${session.access_token}; path=/`;
          // Store user data for potential redirects (even if email confirmation is needed)
          storeUserDataForRedirect(session.user.id, session.user.email || '');
        }
        setSuccess("Account created successfully! Redirecting to pricing...");
        // Redirect to pricing page after successful signup
        setTimeout(() => {
          router.push("/pricing");
        }, 2000);
      }
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      setLoading(false);
      if (error) setError(error.message);
      else setSuccess("Check your email for a password reset link!");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithOAuth({ 
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    setLoading(false);
    if (error) setError(error.message);
    // For OAuth, we'll handle the redirect in the callback
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] p-4 md:p-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight text-center">
            {mode === "signin"
              ? "Welcome Back"
              : mode === "signup"
              ? "Create Account"
              : "Forgot Password"}
          </h1>
          <p className="animate-element animate-delay-200 text-muted-foreground text-center">
            {mode === "signin"
              ? "Access your account and continue your journey with us"
              : mode === "signup"
              ? "Create your account to get started"
              : "Enter your email to reset your password"}
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="animate-element animate-delay-300">
              <label className="text-sm font-medium text-muted-foreground">
                Email Address
              </label>
              <GlassInputWrapper>
                <Input
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </GlassInputWrapper>
            </div>

            {mode !== "forgot" && (
              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">
                  Password
                </label>
                <GlassInputWrapper>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>
            )}

            {mode === "signin" && (
              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span className="text-foreground/90">Keep me signed in</span>
                </label>
                <a
                  href="/auth/forgot"
                  className="text-primary hover:underline transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            )}

            {mode === "signup" && (
              <div className="animate-element animate-delay-500 flex items-start gap-3 text-sm">
                <input 
                  type="checkbox" 
                  id="agreeToTerms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 custom-checkbox" 
                  required
                />
                <label htmlFor="agreeToTerms" className="text-foreground/90 leading-relaxed">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" className="text-primary hover:underline">
                    Terms & Conditions
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="animate-element animate-delay-600 w-full rounded-2xl py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              disabled={loading}
            >
              {loading
                ? "Loading..."
                : mode === "signin"
                ? "Sign In"
                : mode === "signup"
                ? "Sign Up"
                : "Send Reset Link"}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="animate-element animate-delay-700 relative flex items-center justify-center">
                <span className="w-full border-t border-border"></span>
                <span className="px-4 text-sm text-muted-foreground bg-white dark:bg-[#171717] absolute">
                  Or continue with
                </span>
              </div>

              <Button
                variant="outline"
                className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors"
                onClick={handleGoogleSignIn}
                disabled={loading}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
                </svg>
                {loading ? "Loading..." : "Continue with Google"}
              </Button>
            </>
          )}

          {error && <p className="text-red-600 mt-4 text-center animate-fade-in">{error}</p>}
          {success && <p className="text-green-600 mt-4 text-center animate-fade-in">{success}</p>}

          <div className="mt-6 text-center text-sm animate-element animate-delay-900">
            {mode === "signin" ? (
              <>
                New to our platform?{" "}
                <a href="/auth/signup" className="text-primary hover:underline">
                  Create Account
                </a>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <a href="/auth/signin" className="text-primary hover:underline">
                  Sign In
                </a>
              </>
            ) : (
              <>
                Remembered your password?{" "}
                <a href="/auth/signin" className="text-primary hover:underline">
                  Sign In
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

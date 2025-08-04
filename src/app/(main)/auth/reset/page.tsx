"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setSuccess("Password updated! You can now sign in.");
      setTimeout(() => router.push("/auth/signin"), 2000);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] p-4 md:p-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-center">
            Reset Password
          </h1>
          <p className="text-muted-foreground text-center">
            Enter your new password to complete the reset process
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                New Password
              </label>
              <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/10">
                <Input
                  type="password"
                  placeholder="Enter your new password"
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>

          {error && <p className="text-red-600 mt-4 text-center animate-fade-in">{error}</p>}
          {success && <p className="text-green-600 mt-4 text-center animate-fade-in">{success}</p>}

          <div className="mt-6 text-center text-sm">
            <a href="/auth/signin" className="text-primary hover:underline">
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

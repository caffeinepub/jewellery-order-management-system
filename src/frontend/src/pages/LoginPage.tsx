import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor } from "@/hooks/useActor";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AppRole } from "../backend";
import { useAuth } from "../context/AuthContext";

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function LoginPage() {
  const { actor, isFetching } = useActor();
  const { setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initDoneRef = useRef(false);

  // Ensure default admin exists and password hash is correct once actor is ready
  useEffect(() => {
    if (!actor || isFetching || initDoneRef.current) return;
    initDoneRef.current = true;
    actor
      .initDefaultAdmin()
      .catch(() => {})
      .then(() => {
        actor.resetDefaultAdmin().catch(() => {});
      });
  }, [actor, isFetching]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !loginId.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const hash = await sha256hex(password);
      const result = await actor.login(loginId.trim(), hash);

      if (!result) {
        setError("Invalid Login ID or Password. Please try again.");
        return;
      }

      setCurrentUser({
        id: result.id,
        name: result.name,
        role: result.role as AppRole,
        karigarName: result.karigarName,
      });

      navigate({ to: "/" });
    } catch (err) {
      setError("Login failed. Please check your connection and try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center h-14 w-14 rounded-xl mb-4"
            style={{ backgroundColor: "#f97316" }}
          >
            <span className="text-white font-bold text-xl">J</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Jewellery OMS
          </h1>
          <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
            Shree I Jewellery
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl border p-8"
          style={{ backgroundColor: "#141414", borderColor: "#2a2a2a" }}
        >
          <h2 className="text-lg font-semibold text-white mb-6">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="loginId" className="text-sm text-gray-300">
                Login ID
              </Label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "#6b7280" }}
                />
                <Input
                  id="loginId"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. ronakmehta"
                  className="pl-9 bg-[#1f1f1f] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-orange-500 focus:ring-orange-500/20"
                  disabled={isLoading}
                  autoFocus
                  data-ocid="login.input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "#6b7280" }}
                />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 bg-[#1f1f1f] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-orange-500 focus:ring-orange-500/20"
                  disabled={isLoading}
                  data-ocid="login.input"
                />
              </div>
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  backgroundColor: "#2a1010",
                  color: "#f87171",
                  borderLeft: "3px solid #ef4444",
                }}
                data-ocid="login.error_state"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-semibold"
              style={{ backgroundColor: "#f97316", color: "white" }}
              disabled={
                isLoading || !loginId.trim() || !password.trim() || isFetching
              }
              data-ocid="login.primary_button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#4b5563" }}>
          Internal use only · Shree I Jewellery
        </p>
      </div>
    </div>
  );
}

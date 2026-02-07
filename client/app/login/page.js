"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Lock,
    ArrowRight,
    Shield,
    Mail,
    Key,
    AlertTriangle,
    CheckCircle,
    Copy,
    RefreshCw,
    Snowflake,
    ArrowLeft,
    UserPlus
} from "lucide-react";

export default function LoginPage() {
    // Mode: 'login' (UUID) | 'signup' (Email+OTP flow)
    const [mode, setMode] = useState('login');

    // Login mode state
    const [uuid, setUuid] = useState("");

    // Signup mode state
    const [signupStep, setSignupStep] = useState('email'); // 'email' | 'otp' | 'previousToken' | 'success'
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [displayedOtp, setDisplayedOtp] = useState("");
    const [previousToken, setPreviousToken] = useState("");
    const [newToken, setNewToken] = useState("");
    const [reputation, setReputation] = useState(50);
    const [isNewUser, setIsNewUser] = useState(true);
    const [rollNo, setRollNo] = useState("");
    const [requiresPreviousToken, setRequiresPreviousToken] = useState(false);
    const [isReturningUser, setIsReturningUser] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const router = useRouter();

    // ========== LOGIN MODE ==========
    const handleLogin = async (e) => {
        e?.preventDefault();
        if (!uuid.trim()) {
            setError("Token UUID required");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const res = await fetch(`http://localhost:4001/auth/check-token?token=${uuid.trim()}`);
            const data = await res.json();

            if (data.valid && !data.frozen) {
                localStorage.setItem("user_uuid", uuid.trim());
                router.push("/feed");
            } else if (data.frozen) {
                setError("Token frozen (semester reset). Please use Sign Up to get a new token.");
            } else {
                setError("Invalid token. Check your UUID or Sign Up.");
            }
        } catch (err) {
            console.error(err);
            setError("Connection error. Is the server running?");
        } finally {
            setIsLoading(false);
        }
    };

    // ========== SIGNUP MODE ==========
    const validateEmail = (email) => {
        const regex = /^l\d{4}@lhr\.nu\.edu\.pk$/i;
        return regex.test(email);
    };

    const handleRequestOtp = async () => {
        setError("");

        if (!email.trim()) {
            setError("Email is required");
            return;
        }

        if (!validateEmail(email)) {
            setError("Email must be in format lXXXX@lhr.nu.edu.pk");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("http://localhost:4001/auth/request-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.toLowerCase() })
            });

            const data = await res.json();

            if (res.ok) {
                setDisplayedOtp(data.otp);
                setRequiresPreviousToken(data.requiresPreviousToken);
                setIsReturningUser(data.isReturningUser);
                setRollNo(data.rollNo);
                setSignupStep('otp');
            } else {
                setError(data.error || "Failed to send OTP");
            }
        } catch (err) {
            setError("Connection error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError("");

        if (!otp.trim() || otp.length !== 6) {
            setError("Enter a valid 6-digit OTP");
            return;
        }

        if (requiresPreviousToken && signupStep === 'otp') {
            setSignupStep('previousToken');
            return;
        }

        setIsLoading(true);

        try {
            const payload = { email: email.toLowerCase(), otp };
            if (requiresPreviousToken) {
                payload.previousToken = previousToken;
            }

            const res = await fetch("http://localhost:4001/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setNewToken(data.token);
                setReputation(data.reputation);
                setIsNewUser(data.isNewUser);
                localStorage.setItem("user_uuid", data.token);
                setSignupStep('success');
            } else {
                if (data.requiresPreviousToken) {
                    setRequiresPreviousToken(true);
                    setSignupStep('previousToken');
                } else {
                    setError(data.error || "Verification failed");
                }
            }
        } catch (err) {
            setError("Connection error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToken = () => {
        navigator.clipboard.writeText(newToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const resetSignup = () => {
        setSignupStep('email');
        setEmail("");
        setOtp("");
        setPreviousToken("");
        setDisplayedOtp("");
        setError("");
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setError("");
        if (newMode === 'signup') resetSignup();
    };

    return (
        <div className="min-h-screen bg-[#0a0f0d] text-[#e0e0e0] font-mono flex flex-col">

            {/* Top Bar */}
            <header className="flex justify-between items-center px-6 py-4 border-b border-[#1a2a1f]">
                <div className="flex items-center gap-2 text-[#3ecf8e] text-sm tracking-wider">
                    <Shield size={18} />
                    <span>CAMPUS VERITAS</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-[#3ecf8e] animate-pulse"></span>
                    <span className="text-[#6b7c6e]">ONLINE</span>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4">

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 mb-8 bg-[#1a2a1f] p-1 rounded-xl">
                    <button
                        onClick={() => switchMode('login')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'login'
                                ? 'bg-[#3ecf8e] text-black'
                                : 'text-[#6b7c6e] hover:text-white'
                            }`}
                    >
                        LOGIN
                    </button>
                    <button
                        onClick={() => switchMode('signup')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'signup'
                                ? 'bg-[#3ecf8e] text-black'
                                : 'text-[#6b7c6e] hover:text-white'
                            }`}
                    >
                        SIGN UP
                    </button>
                </div>

                {/* Card */}
                <div className="w-full max-w-md border border-dashed border-[#3ecf8e]/40 bg-[#0d1410] p-8 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#3ecf8e]/60"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#3ecf8e]/60"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#3ecf8e]/60"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#3ecf8e]/60"></div>

                    {/* ========== LOGIN MODE ========== */}
                    {mode === 'login' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3ecf8e]/30 to-[#1a2a1f] mb-4">
                                    <Lock size={28} className="text-[#3ecf8e]" />
                                </div>
                                <h1 className="text-2xl font-bold text-white">Login</h1>
                                <p className="text-[#6b7c6e] text-sm mt-2">Enter your anonymous token</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-[#6b7c6e] tracking-widest mb-2">
                                        TOKEN UUID
                                    </label>
                                    <input
                                        type="text"
                                        value={uuid}
                                        onChange={(e) => setUuid(e.target.value)}
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        className="w-full bg-[#0a0f0d] border border-[#2a3a2f] rounded-xl px-4 py-3 text-[#e0e0e0] placeholder-[#4a5a4e] focus:border-[#3ecf8e] focus:outline-none transition-colors font-mono text-sm"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                        <AlertTriangle size={16} />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2eb87a] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#3ecf8e]/20 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <>LOGIN <ArrowRight size={18} /></>}
                                </button>
                            </form>

                            <div className="text-center text-sm text-[#6b7c6e]">
                                <p>Don't have a token or token frozen?</p>
                                <button onClick={() => switchMode('signup')} className="text-[#3ecf8e] hover:underline mt-1">
                                    Sign Up to get a new token →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========== SIGNUP MODE ========== */}
                    {mode === 'signup' && (
                        <>
                            {/* Step 1: Email */}
                            {signupStep === 'email' && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3ecf8e]/30 to-[#1a2a1f] mb-4">
                                            <Mail size={28} className="text-[#3ecf8e]" />
                                        </div>
                                        <h1 className="text-2xl font-bold text-white">Sign Up</h1>
                                        <p className="text-[#6b7c6e] text-sm mt-2">Verify your university email</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-[#6b7c6e] tracking-widest mb-2">UNIVERSITY EMAIL</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                                            placeholder="l1234@lhr.nu.edu.pk"
                                            className="w-full bg-[#0a0f0d] border border-[#2a3a2f] rounded-xl px-4 py-3 text-[#e0e0e0] placeholder-[#4a5a4e] focus:border-[#3ecf8e] focus:outline-none"
                                        />
                                        <p className="text-xs text-[#4a5a4e] mt-2">Format: lXXXX@lhr.nu.edu.pk</p>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                            <AlertTriangle size={16} />{error}
                                        </div>
                                    )}

                                    <button onClick={handleRequestOtp} disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2eb87a] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <>REQUEST OTP <ArrowRight size={18} /></>}
                                    </button>
                                </div>
                            )}

                            {/* Step 2: OTP */}
                            {signupStep === 'otp' && (
                                <div className="space-y-6">
                                    <button onClick={resetSignup} className="flex items-center gap-2 text-[#6b7c6e] hover:text-[#3ecf8e] text-sm">
                                        <ArrowLeft size={16} />Back
                                    </button>

                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3ecf8e]/30 to-[#1a2a1f] mb-4">
                                            <Key size={28} className="text-[#3ecf8e]" />
                                        </div>
                                        <h1 className="text-2xl font-bold text-white">Verify OTP</h1>
                                        <p className="text-[#6b7c6e] text-sm mt-2">Roll: <span className="text-[#3ecf8e]">{rollNo.toUpperCase()}</span></p>
                                    </div>

                                    {/* OTP Display */}
                                    <div className="bg-gradient-to-r from-[#3ecf8e]/10 to-[#2eb87a]/5 border-2 border-dashed border-[#3ecf8e]/50 rounded-xl p-4 text-center">
                                        <p className="text-xs text-[#6b7c6e] mb-2">[DEMO] YOUR OTP:</p>
                                        <p className="text-4xl font-bold text-[#3ecf8e] tracking-[0.5em] font-mono">{displayedOtp}</p>
                                    </div>

                                    {isReturningUser && (
                                        <div className="flex items-start gap-3 p-3 bg-[#ffb300]/10 border border-[#ffb300]/30 rounded-lg text-sm">
                                            <Snowflake size={18} className="text-[#ffb300] mt-0.5" />
                                            <div>
                                                <p className="text-[#ffb300] font-medium">Token was frozen</p>
                                                <p className="text-[#6b7c6e]">You'll need your old token to transfer reputation.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs text-[#6b7c6e] tracking-widest mb-2">ENTER OTP</label>
                                        <input type="text" value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                                            maxLength={6}
                                            className="w-full bg-[#0a0f0d] border border-[#2a3a2f] rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-[#3ecf8e] focus:outline-none"
                                        />
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                            <AlertTriangle size={16} />{error}
                                        </div>
                                    )}

                                    <button onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 6}
                                        className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2eb87a] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <>VERIFY <ArrowRight size={18} /></>}
                                    </button>
                                </div>
                            )}

                            {/* Step 3: Previous Token */}
                            {signupStep === 'previousToken' && (
                                <div className="space-y-6">
                                    <button onClick={() => setSignupStep('otp')} className="flex items-center gap-2 text-[#6b7c6e] hover:text-[#3ecf8e] text-sm">
                                        <ArrowLeft size={16} />Back
                                    </button>

                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ffb300]/30 to-[#1a2a1f] mb-4">
                                            <Snowflake size={28} className="text-[#ffb300]" />
                                        </div>
                                        <h1 className="text-2xl font-bold text-white">Token Recovery</h1>
                                        <p className="text-[#6b7c6e] text-sm mt-2">Transfer your reputation</p>
                                    </div>

                                    <div className="p-4 bg-[#ffb300]/10 border border-[#ffb300]/30 rounded-xl text-sm">
                                        <p className="text-[#ffb300] font-medium mb-1">Semester Reset</p>
                                        <p className="text-[#6b7c6e]">Enter your old token to transfer reputation to a new one.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-[#6b7c6e] tracking-widest mb-2">PREVIOUS TOKEN UUID</label>
                                        <textarea value={previousToken}
                                            onChange={(e) => setPreviousToken(e.target.value.trim())}
                                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                            rows={2}
                                            className="w-full bg-[#0a0f0d] border border-[#2a3a2f] rounded-xl px-4 py-3 focus:border-[#ffb300] focus:outline-none font-mono text-sm resize-none"
                                        />
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                            <AlertTriangle size={16} />{error}
                                        </div>
                                    )}

                                    <button onClick={handleVerifyOtp} disabled={isLoading || !previousToken.trim()}
                                        className="w-full bg-gradient-to-r from-[#ffb300] to-[#e6a200] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <>TRANSFER & GET TOKEN <ArrowRight size={18} /></>}
                                    </button>
                                </div>
                            )}

                            {/* Step 4: Success */}
                            {signupStep === 'success' && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#3ecf8e]/30 to-[#1a2a1f] mb-4">
                                            <CheckCircle size={40} className="text-[#3ecf8e]" />
                                        </div>
                                        <h1 className="text-2xl font-bold text-white">
                                            {isNewUser ? 'Welcome!' : 'Welcome Back!'}
                                        </h1>
                                        <p className="text-[#6b7c6e] text-sm mt-2">
                                            {isNewUser ? 'Your token has been created' : 'Your reputation has been transferred'}
                                        </p>
                                    </div>

                                    <div className="bg-[#1a2a1f] border border-[#2a3a2f] rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-[#6b7c6e]">YOUR TOKEN</span>
                                            <span className="text-xs text-[#3ecf8e] font-bold">REP: {reputation.toFixed(1)}</span>
                                        </div>
                                        <code className="block text-[#3ecf8e] font-mono text-sm break-all bg-[#0a0f0d] p-3 rounded-lg">
                                            {newToken}
                                        </code>
                                        <button onClick={handleCopyToken}
                                            className="w-full mt-3 flex items-center justify-center gap-2 py-2 border border-[#3ecf8e]/30 rounded-lg text-[#3ecf8e] hover:bg-[#3ecf8e]/10 text-sm">
                                            <Copy size={14} />{copied ? 'COPIED!' : 'COPY TOKEN'}
                                        </button>
                                    </div>

                                    <div className="p-4 bg-[#ffb300]/10 border border-[#ffb300]/30 rounded-xl text-sm">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle size={18} className="text-[#ffb300] mt-0.5" />
                                            <div>
                                                <p className="text-[#ffb300] font-medium">Save This Token!</p>
                                                <p className="text-[#6b7c6e]">You'll need it to recover reputation on semester reset (Jan 1 / Aug 1).</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={() => router.push("/feed")}
                                        className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2eb87a] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                        ENTER CAMPUS VERITAS <ArrowRight size={18} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="mt-8 text-xs text-[#3a4a3e]">
                    AUTH_NODE_4.2 // ENCRYPTED
                </div>
            </main>
        </div>
    );
}

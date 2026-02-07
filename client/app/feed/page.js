"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import FeedCard from "../components/FeedCard";
import {
    Shield,
    LogOut,
    Radio,
    CheckCircle,
    Clock,
    Code,
    Send,
    Zap,
    Award,
    Target,
    TrendingUp,
    User
} from "lucide-react";

// Shuffle function (Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function Feed() {
    const [rumors, setRumors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentFilter, setCurrentFilter] = useState("active");
    const [newRumor, setNewRumor] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    const router = useRouter();

    // Shuffle rumors for display
    const shuffledRumors = useMemo(() => shuffleArray(rumors), [rumors]);

    // Fetch user profile
    const fetchUserProfile = async () => {
        const uuid = localStorage.getItem("user_uuid");
        if (!uuid) return;

        try {
            const res = await fetch(`http://localhost:4001/api/user?userId=${uuid}`, {
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                const data = await res.json();
                setUserProfile(data);
            }
        } catch (err) {
            console.error("Failed to fetch user profile:", err);
        }
    };

    useEffect(() => {
        const uuid = localStorage.getItem("user_uuid");
        if (!uuid) {
            router.push("/login");
            return;
        }
        fetchUserProfile();
    }, [router]);

    useEffect(() => {
        const fetchFeed = async () => {
            setLoading(true);
            setError(null);
            const uuid = localStorage.getItem("user_uuid");
            if (!uuid) return;

            try {
                const res = await fetch(`http://localhost:4001/api/feed?userId=${uuid}&filter=${currentFilter}`, {
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                        localStorage.removeItem("user_uuid");
                        router.push("/login");
                        return;
                    }
                    throw new Error("Failed to fetch feed");
                }

                const data = await res.json();
                setRumors(data.rumors || (Array.isArray(data) ? data : []));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (userProfile) fetchFeed();
    }, [currentFilter, userProfile, router]);

    const handleLogout = () => {
        localStorage.removeItem("user_uuid");
        router.push("/login");
    };

    const handlePost = async () => {
        if (!newRumor.trim()) return;
        const uuid = localStorage.getItem("user_uuid");
        if (!uuid) return;

        setIsPosting(true);
        try {
            const res = await fetch("http://localhost:4001/api/rumor", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": uuid },
                body: JSON.stringify({ content: newRumor })
            });

            if (res.ok) {
                const data = await res.json();
                setNewRumor("");
                // Refresh user profile to show updated reputation
                fetchUserProfile();
                alert(`[TRANSMISSION QUEUED]\nRumor will appear in ~${data.visibleInMinutes || '?'} minutes.\nPost cost: -${data.newReputation ? userProfile.postCost : '?'} REP`);
            } else {
                alert("[ERROR] Transmission failed.");
            }
        } catch (err) {
            alert("[ERROR] Connection lost.");
        } finally {
            setIsPosting(false);
        }
    };

    const handleVote = async (rumorId, type) => {
        const uuid = localStorage.getItem("user_uuid");
        if (!uuid) return;

        try {
            const res = await fetch("http://localhost:4001/api/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": uuid },
                body: JSON.stringify({ rumorId, type })
            });

            if (res.ok) {
                const data = await res.json();
                setRumors(prev => prev.map(r =>
                    r.id === rumorId ? { ...r, trustScore: data.updatedScore, vote: data.vote } : r
                ));
                // Refresh user profile
                fetchUserProfile();
            }
        } catch (e) {
            console.error("Vote error", e);
        }
    };

    const tabs = [
        { id: 'active', label: 'Feed', icon: Radio, desc: 'Live rumors' },
        { id: 'voted', label: 'My Votes', icon: CheckCircle, desc: 'Your verifications' },
        { id: 'results', label: 'Results', icon: Clock, desc: 'Finalized rumors' },
    ];

    if (!userProfile) {
        return (
            <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
                <div className="text-center text-[#6b7c6e]">
                    <div className="w-8 h-8 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div>LOADING_PROFILE...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f0d] text-[#e0e0e0] font-mono">

            {/* ===== HEADER ===== */}
            <header className="bg-gradient-to-b from-[#0d1410] to-[#0a0f0d] border-b border-[#2a3a2f]">
                <div className="max-w-5xl mx-auto px-6 py-5">
                    {/* Top Row: Logo and Logout */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3ecf8e] to-[#2eb87a] flex items-center justify-center">
                                <Shield size={24} className="text-black" />
                            </div>
                            <div>
                                <div className="text-white font-bold text-xl tracking-wide">CAMPUS VERITAS</div>
                                <div className="text-[#3ecf8e] text-xs tracking-widest">TRUTH_PROTOCOL • V4.2</div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 hover:border-red-500 transition-all text-sm font-medium"
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>

                    {/* User Profile Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* UUID */}
                        <div className="bg-[#1a2a1f] border border-[#2a3a2f] rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-[#6b7c6e] mb-1">
                                <User size={12} />
                                UUID
                            </div>
                            <div className="text-[#3ecf8e] font-bold tracking-wide text-sm">
                                {userProfile.id.slice(0, 8).toUpperCase()}
                            </div>
                        </div>

                        {/* Reputation */}
                        <div className="bg-[#1a2a1f] border border-[#2a3a2f] rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-[#6b7c6e] mb-1">
                                <Award size={12} />
                                REPUTATION
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg ${userProfile.reputation >= 80 ? 'text-[#3ecf8e]' :
                                    userProfile.reputation >= 50 ? 'text-[#ffb300]' : 'text-[#cc5c45]'
                                    }`}>
                                    {userProfile.reputation.toFixed(1)}
                                </span>
                                <span className="text-xs text-[#6b7c6e]">/ {userProfile.constants.REP_MAX}</span>
                                {userProfile.isSenior && (
                                    <span className="px-1.5 py-0.5 bg-[#AB47BC]/20 text-[#AB47BC] text-[10px] rounded font-bold">
                                        SENIOR
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Vote Power */}
                        <div className="bg-[#1a2a1f] border border-[#2a3a2f] rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-[#6b7c6e] mb-1">
                                <Zap size={12} />
                                VOTE POWER
                            </div>
                            <div className="text-white font-bold text-lg">
                                {userProfile.votePower.toFixed(2)}x
                            </div>
                        </div>

                        {/* Post Cost */}
                        <div className="bg-[#1a2a1f] border border-[#2a3a2f] rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-[#6b7c6e] mb-1">
                                <Target size={12} />
                                POST COST
                            </div>
                            <div className="text-[#cc5c45] font-bold text-lg">
                                -{userProfile.postCost} REP
                            </div>
                        </div>
                    </div>

                    {/* Voting Stats */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-[#6b7c6e]">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={12} className="text-[#3ecf8e]" />
                            <span>Verifications: <span className="text-[#3ecf8e] font-bold">{userProfile.stats.verifyVotes}</span>&nbsp;&nbsp;&nbsp;</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingUp size={12} className="text-[#cc5c45] rotate-180" />
                            <span>Disputes: <span className="text-[#cc5c45] font-bold">{userProfile.stats.disputeVotes}</span>&nbsp;&nbsp;&nbsp;</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Total: <span className="text-white font-bold">{userProfile.stats.totalVotes}</span> votes</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== TAB NAVIGATION ===== */}
            <div className="bg-[#0a0f0d] border-b border-[#2a3a2f] sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex gap-3">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = currentFilter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setCurrentFilter(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-sm font-bold transition-all ${isActive
                                        ? 'bg-gradient-to-r from-[#3ecf8e] to-[#2eb87a] text-black shadow-lg shadow-[#3ecf8e]/20'
                                        : 'bg-[#1a2a1f] text-[#6b7c6e] hover:bg-[#2a3a2f] hover:text-[#e0e0e0] border border-[#2a3a2f]'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ===== MAIN FEED ===== */}
            <main className="max-w-5xl mx-auto px-6 py-8 pb-48">

                {/* Feed Status */}
                <div className="flex items-center gap-3 mb-6">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3ecf8e] animate-pulse"></span>
                    <span className="text-[#3ecf8e] text-sm tracking-wider font-medium">
                        {currentFilter === 'active' ? 'LIVE_FEED' : currentFilter === 'voted' ? 'MY_VERIFICATIONS' : 'RESOLVED_RUMORS'}
                    </span>
                    <span className="text-[#4a5a4e]">•</span>
                    <span className="text-[#6b7c6e] text-sm">ENCRYPTED</span>
                    {userProfile.isSenior && currentFilter === 'active' && (
                        <>
                            <span className="text-[#4a5a4e]">•</span>
                            <span className="text-[#AB47BC] text-sm font-medium">TRIBUNAL_ACCESS_GRANTED</span>
                        </>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#6b7c6e]">
                        <div className="w-8 h-8 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <div className="text-lg">LOADING_DATA...</div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <div className="text-red-500 text-xl mb-2">[ERROR]</div>
                        <div className="text-[#6b7c6e]">{error}</div>
                    </div>
                ) : shuffledRumors.length === 0 ? (
                    <div className="text-center py-20 text-[#6b7c6e]">
                        <div className="text-xl mb-2">[NO_DATA]</div>
                        <div className="text-sm">No rumors found in this section.</div>
                    </div>
                ) : (
                    <AnimatePresence>
                        {shuffledRumors.map(rumor => (
                            <FeedCard
                                key={rumor.id}
                                rumor={rumor}
                                onVote={handleVote}
                                userProfile={userProfile}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </main>

            {/* ===== BOTTOM COMPOSER ===== */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0d1410] to-[#0d1410]/95 backdrop-blur-sm border-t border-[#2a3a2f]">
                <div className="max-w-5xl mx-auto px-6 py-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Code size={16} className="text-[#3ecf8e]" />
                        <span className="text-xs text-[#6b7c6e] tracking-wider">WHISPER_COMPOSER</span>
                        <span className="text-xs text-[#cc5c45]">Cost: -{userProfile.postCost} REP</span>
                        <span className="ml-auto flex items-center gap-2 text-xs text-[#3ecf8e]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]"></span>
                            ENCRYPTED
                        </span>
                    </div>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={newRumor}
                            onChange={(e) => setNewRumor(e.target.value)}
                            placeholder="// Enter your whisper here..."
                            className="flex-1 bg-[#0a0f0d] border-2 border-[#2a3a2f] rounded-xl px-5 py-4 text-[#e0e0e0] placeholder-[#4a5a4e] focus:border-[#3ecf8e] focus:outline-none transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                        />
                        <button
                            onClick={handlePost}
                            disabled={!newRumor.trim() || isPosting}
                            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#3ecf8e] to-[#2eb87a] text-black font-bold rounded-xl hover:shadow-lg hover:shadow-[#3ecf8e]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                            <span className="hidden sm:inline">{isPosting ? 'SENDING...' : 'SUBMIT'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

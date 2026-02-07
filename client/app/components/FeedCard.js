"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, X, Lock, AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, TrendingDown } from "lucide-react";
import VoteConfirmDialog from "./VoteConfirmDialog";

export default function FeedCard({ rumor, onVote, userProfile }) {
    // Bot Defense: Random button positions and wiggle
    const [buttonOrder, setButtonOrder] = useState('verify-first');
    const [offsets, setOffsets] = useState({ verify: { x: 0, y: 0 }, dispute: { x: 0, y: 0 } });

    // Vote confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingVoteType, setPendingVoteType] = useState(null);

    useEffect(() => {
        setButtonOrder(Math.random() > 0.5 ? 'verify-first' : 'dispute-first');
        setOffsets({
            verify: { x: Math.random() * 20 - 10, y: Math.random() * 6 - 3 },
            dispute: { x: Math.random() * 20 - 10, y: Math.random() * 6 - 3 }
        });
    }, [rumor.id]);

    // Logic
    const isFinalized = ['SETTLED', 'REJECTED'].includes(rumor.status) || new Date(rumor.settlesAt) < new Date();
    const hasVoted = !!rumor.vote;
    const canAct = !isFinalized && !hasVoted;

    // Trust Consensus (0-100 scale)
    const trustPercent = Math.min(100, Math.max(0, 50 + (rumor.trustScore || 0) * 5));
    const winnerIsVerify = trustPercent >= 50;

    // Calculate vote outcome for this user (if voted and finalized)
    const getVoteOutcome = () => {
        if (!isFinalized || !rumor.vote) return null;
        const userVotedVerify = rumor.vote.type === 1;
        const didWin = userVotedVerify === winnerIsVerify;
        return {
            didWin,
            points: didWin ? (userProfile?.constants?.REWARD_CONSENSUS || 5) : -(userProfile?.constants?.PENALTY_SLASH || 15),
            label: didWin ? 'CONSENSUS MATCH' : 'SLASHED'
        };
    };
    const voteOutcome = getVoteOutcome();

    // Time Ago
    const timeAgo = (dateStr) => {
        const diff = (new Date() - new Date(dateStr)) / 1000;
        if (diff < 60) return `${Math.floor(diff)}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    // Status Badge
    const getStatusConfig = () => {
        if (rumor.status === 'SETTLED' || (isFinalized && trustPercent >= 50)) {
            return { label: 'VERIFIED', color: 'text-[#3ecf8e]', bg: 'bg-[#3ecf8e]/20', borderColor: 'border-[#3ecf8e]/30' };
        }
        if (rumor.status === 'REJECTED' || (isFinalized && trustPercent < 50)) {
            return { label: 'DEBUNKED', color: 'text-[#cc5c45]', bg: 'bg-[#cc5c45]/20', borderColor: 'border-[#cc5c45]/30' };
        }
        if (rumor.status === 'TRIBUNAL') {
            return { label: 'TRIBUNAL', color: 'text-[#AB47BC]', bg: 'bg-[#9C27B0]/20', borderColor: 'border-[#9C27B0]/30' };
        }
        if (hasVoted) {
            return { label: 'VOTED', color: 'text-[#3ecf8e]', bg: 'bg-[#3ecf8e]/20', borderColor: 'border-[#3ecf8e]/30' };
        }
        return { label: 'PENDING', color: 'text-[#ffb300]', bg: 'bg-[#ffb300]/20', borderColor: 'border-[#ffb300]/30' };
    };

    const status = getStatusConfig();

    // Handle vote click - show confirmation dialog
    const handleVoteClick = (type) => {
        setPendingVoteType(type);
        setShowConfirmDialog(true);
    };

    // Handle confirmed vote
    const handleConfirmVote = () => {
        if (pendingVoteType) {
            onVote(rumor.id, pendingVoteType);
        }
    };

    // Button components
    const VerifyButton = () => (
        <motion.button
            animate={{ x: offsets.verify.x, y: offsets.verify.y }}
            transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
            onClick={() => handleVoteClick(1)}
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-[#3ecf8e]/10 border-2 border-[#3ecf8e]/50 text-[#3ecf8e] rounded-xl hover:bg-[#3ecf8e]/20 hover:border-[#3ecf8e] transition-all text-base font-bold tracking-wide"
        >
            <Check size={20} strokeWidth={3} />
            VERIFY
        </motion.button>
    );

    const DisputeButton = () => (
        <motion.button
            animate={{ x: offsets.dispute.x, y: offsets.dispute.y }}
            transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
            onClick={() => handleVoteClick(-1)}
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-[#cc5c45]/10 border-2 border-[#cc5c45]/50 text-[#cc5c45] rounded-xl hover:bg-[#cc5c45]/20 hover:border-[#cc5c45] transition-all text-base font-bold tracking-wide"
        >
            <X size={20} strokeWidth={3} />
            DISPUTE
        </motion.button>
    );

    // Card border color
    const getCardBorderColor = () => {
        if (isFinalized) {
            return trustPercent >= 50 ? 'border-[#3ecf8e]' : 'border-[#cc5c45]';
        }
        return 'border-[#2a3a2f]';
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#0d1410] border-2 ${getCardBorderColor()} rounded-2xl p-6 mb-5 relative overflow-hidden`}
            >
                {/* Decorative corner accents */}
                <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-2xl ${isFinalized ? (trustPercent >= 50 ? 'border-[#3ecf8e]/50' : 'border-[#cc5c45]/50') : 'border-[#3ecf8e]/30'}`}></div>
                <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-2xl ${isFinalized ? (trustPercent >= 50 ? 'border-[#3ecf8e]/50' : 'border-[#cc5c45]/50') : 'border-[#3ecf8e]/30'}`}></div>
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-2xl ${isFinalized ? (trustPercent >= 50 ? 'border-[#3ecf8e]/50' : 'border-[#cc5c45]/50') : 'border-[#3ecf8e]/30'}`}></div>
                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-2xl ${isFinalized ? (trustPercent >= 50 ? 'border-[#3ecf8e]/50' : 'border-[#cc5c45]/50') : 'border-[#3ecf8e]/30'}`}></div>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3ecf8e]/30 to-[#1a2a1f] flex items-center justify-center text-[#3ecf8e] text-lg font-bold border border-[#3ecf8e]/20">
                            {rumor.author?.reputation ? Math.floor(rumor.author.reputation) : "?"}
                        </div>
                        <div>
                            <div className="text-[#e0e0e0] font-medium text-sm">
                                ID: #{rumor.id.slice(0, 8).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#6b7c6e] mt-1">
                                <span>@{rumor.authorId.slice(0, 8)}</span>
                                <span>•</span>
                                <Clock size={12} />
                                <span>{timeAgo(rumor.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider ${status.bg} ${status.color} border ${status.borderColor}`}>
                        {status.label}
                    </div>
                </div>

                {/* Content */}
                <div className="text-[#e0e0e0] text-lg leading-relaxed mb-6 font-sans pl-16">
                    {rumor.content}
                </div>

                {/* Trust Consensus Bar */}
                <div className="mb-6 pl-16">
                    <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-[#6b7c6e] tracking-wider font-medium">TRUST_CONSENSUS</span>
                        <span className={`font-bold ${isFinalized ? (trustPercent >= 50 ? 'text-[#3ecf8e]' : 'text-[#cc5c45]') : 'text-[#6b7c6e]'}`}>
                            {isFinalized ? `${Math.round(trustPercent)}% ${trustPercent >= 50 ? 'VERIFIED' : 'DISPUTED'}` : '[HIDDEN]'}
                        </span>
                    </div>
                    <div className="h-2 bg-[#1a2a1f] rounded-full overflow-hidden">
                        {isFinalized ? (
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${trustPercent}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full rounded-full ${trustPercent >= 50 ? 'bg-gradient-to-r from-[#2eb87a] to-[#3ecf8e]' : 'bg-gradient-to-r from-[#cc5c45] to-[#cc5c45]'}`}
                            />
                        ) : (
                            <div className="h-full w-1/2 bg-[#3a4a3e]/50" />
                        )}
                    </div>
                </div>

                {/* Action Buttons / Vote Status */}
                <div className="pl-16">
                    {canAct ? (
                        <div className="flex gap-4">
                            {buttonOrder === 'verify-first' ? (
                                <>
                                    <VerifyButton />
                                    <DisputeButton />
                                </>
                            ) : (
                                <>
                                    <DisputeButton />
                                    <VerifyButton />
                                </>
                            )}
                        </div>
                    ) : hasVoted && !isFinalized ? (
                        // Voted but not yet finalized
                        <div className="flex items-center justify-between py-4 px-5 bg-[#1a2a1f] border border-[#2a3a2f] rounded-xl">
                            <div className="flex items-center gap-3 text-[#6b7c6e]">
                                <Lock size={18} />
                                <span className="font-medium">
                                    VOTE CAST: {rumor.vote.type === 1 ? 'VERIFIED' : 'DISPUTED'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Zap size={14} className="text-[#3ecf8e]" />
                                <span className="text-[#3ecf8e] font-bold">
                                    {(rumor.vote.weight || (userProfile?.votePower || 1)).toFixed(2)}x POWER
                                </span>
                            </div>
                        </div>
                    ) : isFinalized ? (
                        // Finalized - show result and rewards/penalty
                        <div className="space-y-3">
                            <div className={`flex items-center justify-center gap-3 py-4 rounded-xl font-medium ${trustPercent >= 50
                                    ? 'bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e]'
                                    : 'bg-[#cc5c45]/10 border border-[#cc5c45]/30 text-[#cc5c45]'
                                }`}>
                                {trustPercent >= 50 ? <CheckCircle size={18} /> : <X size={18} />}
                                <span>CONSENSUS: {trustPercent >= 50 ? 'VERIFIED ✓' : 'DEBUNKED ✗'}</span>
                            </div>

                            {/* Show vote outcome if user voted */}
                            {voteOutcome && (
                                <div className={`flex items-center justify-between py-3 px-5 rounded-xl ${voteOutcome.didWin
                                        ? 'bg-[#3ecf8e]/10 border border-[#3ecf8e]/30'
                                        : 'bg-[#cc5c45]/10 border border-[#cc5c45]/30'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        {voteOutcome.didWin ? (
                                            <TrendingUp size={18} className="text-[#3ecf8e]" />
                                        ) : (
                                            <TrendingDown size={18} className="text-[#cc5c45]" />
                                        )}
                                        <span className={`text-sm font-medium ${voteOutcome.didWin ? 'text-[#3ecf8e]' : 'text-[#cc5c45]'}`}>
                                            YOUR VOTE: {rumor.vote.type === 1 ? 'VERIFIED' : 'DISPUTED'}
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm font-bold ${voteOutcome.didWin ? 'text-[#3ecf8e]' : 'text-[#cc5c45]'
                                        }`}>
                                        {voteOutcome.points > 0 ? '+' : ''}{voteOutcome.points} REP
                                        <span className="text-xs font-normal opacity-75">
                                            ({voteOutcome.label})
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </motion.div>

            {/* Vote Confirmation Dialog */}
            <VoteConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => {
                    setShowConfirmDialog(false);
                    setPendingVoteType(null);
                }}
                onConfirm={handleConfirmVote}
                voteType={pendingVoteType}
                userUuid={userProfile?.id}
                votePower={userProfile?.votePower}
                rewardPoints={userProfile?.constants?.REWARD_CONSENSUS || 5}
                penaltyPoints={userProfile?.constants?.PENALTY_SLASH || 15}
            />
        </>
    );
}

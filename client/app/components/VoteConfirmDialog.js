"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle, Check, Shield, Lock } from "lucide-react";

export default function VoteConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    voteType,
    userUuid,
    votePower,
    rewardPoints,
    penaltyPoints
}) {
    const [inputUuid, setInputUuid] = useState("");
    const [isConfirmEnabled, setIsConfirmEnabled] = useState(false);
    const [position, setPosition] = useState({ x: 50, y: 50 });

    // Generate random position when dialog opens
    useEffect(() => {
        if (isOpen) {
            // Random percentage-based position (20-60% range for both axes)
            const randomX = Math.floor(Math.random() * 40) + 20; // 20-60%
            const randomY = Math.floor(Math.random() * 30) + 15; // 15-45%
            setPosition({ x: randomX, y: randomY });
            setInputUuid("");
            setIsConfirmEnabled(false);
        }
    }, [isOpen]);

    // Check UUID match
    useEffect(() => {
        const required = userUuid?.slice(0, 8)?.toUpperCase() || "";
        const input = inputUuid.toUpperCase().replace(/-/g, "");
        setIsConfirmEnabled(input === required);
    }, [inputUuid, userUuid]);

    if (!isOpen) return null;

    const isVerify = voteType === 1;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute bg-[#0d1410] border-2 border-[#3ecf8e]/50 rounded-2xl shadow-2xl w-[380px] max-w-[90vw]"
                style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                {/* Header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${isVerify ? 'border-[#3ecf8e]/30' : 'border-[#cc5c45]/30'
                    }`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isVerify ? 'bg-[#3ecf8e]/20 text-[#3ecf8e]' : 'bg-[#cc5c45]/20 text-[#cc5c45]'
                            }`}>
                            {isVerify ? <Check size={16} /> : <X size={16} />}
                        </div>
                        <div className="text-white font-bold text-sm">
                            CONFIRM {isVerify ? 'VERIFY' : 'DISPUTE'}
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#1a2a1f] hover:bg-red-500/20 flex items-center justify-center text-[#6b7c6e] hover:text-red-400">
                        <X size={14} />
                    </button>
                </div>

                {/* Warning */}
                <div className="px-4 py-3 border-b border-[#2a3a2f]">
                    <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-amber-400 text-xs font-medium">Vote cannot be changed!</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="px-4 py-2 border-b border-[#2a3a2f] grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#1a2a1f] rounded-lg p-2">
                        <div className="text-[#6b7c6e]">POWER</div>
                        <div className={`font-bold ${isVerify ? 'text-[#3ecf8e]' : 'text-[#cc5c45]'}`}>
                            {votePower?.toFixed(1) || '0'}x
                        </div>
                    </div>
                    <div className="bg-[#1a2a1f] rounded-lg p-2">
                        <div className="text-[#6b7c6e]">WIN</div>
                        <div className="font-bold text-[#3ecf8e]">+{rewardPoints || 5}</div>
                    </div>
                    <div className="bg-[#1a2a1f] rounded-lg p-2">
                        <div className="text-[#6b7c6e]">LOSE</div>
                        <div className="font-bold text-[#cc5c45]">-{penaltyPoints || 15}</div>
                    </div>
                </div>

                {/* UUID Input */}
                <div className="px-4 py-3 border-b border-[#2a3a2f]">
                    <div className="flex items-center gap-1 mb-2 text-xs text-[#6b7c6e]">
                        <Lock size={10} />
                        <span>Enter first 8 chars of your UUID:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={inputUuid}
                            onChange={(e) => setInputUuid(e.target.value.slice(0, 8))}
                            placeholder={userUuid?.slice(0, 8)?.toUpperCase() || "XXXXXXXX"}
                            className="flex-1 bg-[#0a0f0d] border border-[#2a3a2f] rounded-lg px-3 py-2 text-white placeholder-[#4a5a4e] font-mono tracking-wider uppercase text-sm focus:border-[#3ecf8e] focus:outline-none"
                            maxLength={8}
                            autoFocus
                        />
                        {isConfirmEnabled && (
                            <Check size={18} className="text-[#3ecf8e]" />
                        )}
                    </div>
                </div>

                {/* Buttons */}
                <div className="px-4 py-3 flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 bg-[#1a2a1f] border border-[#2a3a2f] text-[#6b7c6e] rounded-lg hover:text-white text-sm">
                        CANCEL
                    </button>
                    <button
                        onClick={() => { if (isConfirmEnabled) { onConfirm(); onClose(); } }}
                        disabled={!isConfirmEnabled}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${isConfirmEnabled
                                ? isVerify ? 'bg-[#3ecf8e] text-black' : 'bg-[#cc5c45] text-white'
                                : 'bg-[#1a2a1f] text-[#4a5a4e] cursor-not-allowed'
                            }`}
                    >
                        <Shield size={12} />
                        {isConfirmEnabled ? 'CONFIRM' : 'LOCKED'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

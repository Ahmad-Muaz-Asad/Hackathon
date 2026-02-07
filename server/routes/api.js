import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
    JITTER_MIN_MS,
    JITTER_MAX_MS,
    SETTLEMENT_TIME_MS,
    COST_POST_HIGH,
    COST_POST_LOW,
    VOTE_MULTIPLIER,
    REP_SENIOR,
    TRIBUNAL_DURATION_MS,
    TRIBUNAL_REJECTION_RATE,
    REWARD_CONSENSUS,
    PENALTY_SLASH,
    REP_MAX
} from '../constants.js';

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// HELPER: Auto-transition TRIBUNAL -> PUBLIC
// Called on feed fetch to lazily update status
// ============================================
async function autoTransitionTribunalToPublic() {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - TRIBUNAL_DURATION_MS);

    // Find TRIBUNAL rumors where visibleAt was more than 2 hours ago
    const rumorsToTransition = await prisma.rumor.findMany({
        where: {
            status: 'TRIBUNAL',
            visibleAt: { lte: twoHoursAgo }
        }
    });

    for (const rumor of rumorsToTransition) {
        await prisma.rumor.update({
            where: { id: rumor.id },
            data: { status: 'PUBLIC' }
        });
        console.log(`[AUTO-TRANSITION] Rumor ${rumor.id.slice(0, 8)} moved from TRIBUNAL to PUBLIC`);
    }

    return rumorsToTransition.length;
}

// ============================================
// HELPER: Check Kill Switch (40% Senior Rejection)
// Called after each vote on TRIBUNAL rumors
// ============================================
async function checkKillSwitch(rumorId) {
    const rumor = await prisma.rumor.findUnique({
        where: { id: rumorId },
        include: { votes: { include: { user: true } } }
    });

    if (!rumor || rumor.status !== 'TRIBUNAL') return null;

    // Filter only Senior votes (Rep >= 80)
    const seniorVotes = rumor.votes.filter(v => v.user.reputation >= REP_SENIOR);

    if (seniorVotes.length === 0) return null;

    const totalSeniorVotes = seniorVotes.length;
    const disputeVotes = seniorVotes.filter(v => v.type === -1).length;
    const disputeRate = disputeVotes / totalSeniorVotes;

    console.log(`[KILL-SWITCH CHECK] Rumor ${rumorId.slice(0, 8)}: ${disputeVotes}/${totalSeniorVotes} disputes (${(disputeRate * 100).toFixed(1)}%)`);

    // If 40% or more Seniors disputed, REJECT immediately
    if (disputeRate >= TRIBUNAL_REJECTION_RATE) {
        await prisma.rumor.update({
            where: { id: rumorId },
            data: { status: 'REJECTED' }
        });
        console.log(`[KILL-SWITCH TRIGGERED] Rumor ${rumorId.slice(0, 8)} REJECTED by Senior consensus`);

        // Distribute reputation rewards/penalties
        await distributeReputationRewards(rumorId, false); // false = disputed won

        return 'REJECTED';
    }

    return null;
}

// ============================================
// HELPER: Distribute Reputation Rewards/Penalties
// Called when a rumor is finalized
// winnerIsVerify: true = Verified won, false = Disputed won
// ============================================
async function distributeReputationRewards(rumorId, winnerIsVerify) {
    const votes = await prisma.vote.findMany({
        where: { rumorId },
        include: { user: true }
    });

    const winningType = winnerIsVerify ? 1 : -1;

    for (const vote of votes) {
        const isWinner = vote.type === winningType;
        const reputationChange = isWinner ? REWARD_CONSENSUS : -PENALTY_SLASH;

        // Calculate new reputation (capped at 0 and REP_MAX)
        let newRep = vote.user.reputation + reputationChange;
        newRep = Math.max(0, Math.min(REP_MAX, newRep));

        await prisma.user.update({
            where: { id: vote.userId },
            data: { reputation: newRep }
        });

        console.log(`[REP UPDATE] User ${vote.userId.slice(0, 8)}: ${vote.user.reputation.toFixed(1)} -> ${newRep.toFixed(1)} (${isWinner ? '+5 WIN' : '-15 SLASH'})`);
    }
}

// ============================================
// HELPER: Settle a rumor (when settlesAt has passed)
// ============================================
async function settleRumor(rumorId) {
    const rumor = await prisma.rumor.findUnique({
        where: { id: rumorId }
    });

    if (!rumor || ['SETTLED', 'REJECTED'].includes(rumor.status)) {
        return null;
    }

    // Determine winner based on trustScore
    const verified = rumor.trustScore >= 0;
    const newStatus = verified ? 'SETTLED' : 'REJECTED';

    await prisma.rumor.update({
        where: { id: rumorId },
        data: { status: newStatus }
    });

    console.log(`[SETTLEMENT] Rumor ${rumorId.slice(0, 8)} -> ${newStatus} (trustScore: ${rumor.trustScore.toFixed(2)})`);

    // Distribute rewards
    await distributeReputationRewards(rumorId, verified);

    return newStatus;
}

// ============================================
// Middleware to get user from header
// ============================================
async function getUser(req, res, next) {
    const userId = req.headers['x-user-id'] || req.query.userId || (req.body && req.body.userId);
    if (!userId) {
        return res.status(401).json({ error: 'Missing x-user-id header or userId query param' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if token is frozen
        if (user.frozen) {
            return res.status(403).json({
                error: 'Token frozen',
                message: 'Your token has been frozen. Please sign in again to get a new token.',
                frozen: true
            });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal User Error' });
    }
}

// ============================================
// GET /user - Get user profile with computed fields
// ============================================
router.get('/user', getUser, async (req, res) => {
    try {
        const user = req.user;
        const votePower = user.reputation * VOTE_MULTIPLIER;
        const postCost = user.reputation > 60 ? COST_POST_HIGH : COST_POST_LOW;
        const isSenior = user.reputation >= REP_SENIOR;

        // Get user's voting stats
        const voteStats = await prisma.vote.groupBy({
            by: ['type'],
            where: { userId: user.id },
            _count: true
        });

        const verifyVotes = voteStats.find(v => v.type === 1)?._count || 0;
        const disputeVotes = voteStats.find(v => v.type === -1)?._count || 0;

        res.json({
            id: user.id,
            reputation: user.reputation,
            votePower: votePower,
            postCost: postCost,
            isSenior: isSenior,
            joinedAt: user.joinedAt,
            stats: {
                totalVotes: verifyVotes + disputeVotes,
                verifyVotes,
                disputeVotes
            },
            constants: {
                VOTE_MULTIPLIER,
                REWARD_CONSENSUS,
                PENALTY_SLASH,
                REP_SENIOR,
                REP_MAX
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// ============================================
// GET /feed
// ============================================
router.get('/feed', getUser, async (req, res) => {
    try {
        // Lazy auto-transition TRIBUNAL -> PUBLIC
        await autoTransitionTribunalToPublic();

        const userRep = req.user.reputation;
        const { filter } = req.query;
        const now = new Date();

        let whereClause = {};

        if (filter === 'voted') {
            whereClause = {
                votes: { some: { userId: req.user.id } }
            };
        } else if (filter === 'results') {
            whereClause = {
                OR: [
                    { status: 'REJECTED' },
                    { status: 'SETTLED' },
                    { settlesAt: { lt: now } }
                ]
            };
        } else {
            // Active Feed
            const allowedStatuses = ['PUBLIC'];
            if (userRep >= REP_SENIOR) {
                allowedStatuses.push('TRIBUNAL');
            }

            whereClause = {
                status: { in: allowedStatuses },
                settlesAt: { gt: now },
                visibleAt: { lte: now }
            };
        }

        const rumors = await prisma.rumor.findMany({
            where: whereClause,
            orderBy: { visibleAt: 'desc' },
            include: {
                author: { select: { id: true, reputation: true } },
                votes: true
            }
        });

        // Add 'vote' field and check for lazy settlement
        const rumorsWithVote = [];
        for (const r of rumors) {
            // Lazy settle if time has passed
            if (new Date(r.settlesAt) < now && !['SETTLED', 'REJECTED'].includes(r.status)) {
                await settleRumor(r.id);
                r.status = r.trustScore >= 0 ? 'SETTLED' : 'REJECTED';
            }

            const myVote = r.votes.find(v => v.userId === req.user.id);
            rumorsWithVote.push({
                ...r,
                vote: myVote || null
            });
        }

        res.json({ rumors: rumorsWithVote, isSenior: userRep >= REP_SENIOR });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

// ============================================
// POST /rumor
// ============================================
router.post('/rumor', getUser, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        const user = req.user;
        const cost = user.reputation > 60 ? COST_POST_HIGH : COST_POST_LOW;

        const now = Date.now();
        const jitter = Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)) + JITTER_MIN_MS;
        const visibleAt = new Date(now + jitter);
        const settlesAt = new Date(now + SETTLEMENT_TIME_MS);

        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: { reputation: { decrement: cost } }
            });

            const rumor = await tx.rumor.create({
                data: {
                    content,
                    authorId: user.id,
                    status: 'TRIBUNAL',
                    visibleAt,
                    settlesAt
                }
            });

            return { rumor, updatedUser };
        });

        res.json({
            message: 'Rumor created',
            rumor: result.rumor,
            newReputation: result.updatedUser.reputation,
            visibleAt: result.rumor.visibleAt,
            visibleInMinutes: Math.round(jitter / 60000)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create rumor' });
    }
});

// ============================================
// POST /vote
// ============================================
router.post('/vote', getUser, async (req, res) => {
    try {
        const { rumorId, type } = req.body;

        if (![1, -1].includes(type)) {
            return res.status(400).json({ error: 'Invalid vote type. Must be 1 or -1' });
        }

        const voteWeight = req.user.reputation * VOTE_MULTIPLIER;

        // Check if Rumor is active
        const rumor = await prisma.rumor.findUnique({ where: { id: rumorId } });
        if (!rumor) {
            return res.status(404).json({ error: 'Rumor not found' });
        }
        if (['SETTLED', 'REJECTED'].includes(rumor.status)) {
            return res.status(400).json({ error: 'Voting is closed for this rumor' });
        }
        if (new Date() > new Date(rumor.settlesAt)) {
            // Lazy settle
            await settleRumor(rumorId);
            return res.status(400).json({ error: 'Voting is closed for this rumor' });
        }

        // Create Vote & Update TrustScore
        const result = await prisma.$transaction(async (tx) => {
            const vote = await tx.vote.create({
                data: {
                    userId: req.user.id,
                    rumorId,
                    type,
                    weight: voteWeight
                }
            });

            const delta = type * voteWeight;
            const updatedRumor = await tx.rumor.update({
                where: { id: rumorId },
                data: { trustScore: { increment: delta } }
            });

            return { vote, updatedRumor };
        });

        // Check Kill Switch for TRIBUNAL rumors
        let killSwitchResult = null;
        if (rumor.status === 'TRIBUNAL') {
            killSwitchResult = await checkKillSwitch(rumorId);
        }

        res.json({
            message: 'Vote cast',
            vote: result.vote,
            updatedScore: result.updatedRumor.trustScore,
            killSwitch: killSwitchResult
        });

    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'You have already voted on this rumor' });
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to cast vote' });
    }
});

// ============================================
// POST /settle/:rumorId (Manual settlement endpoint)
// ============================================
router.post('/settle/:rumorId', async (req, res) => {
    try {
        const { rumorId } = req.params;
        const result = await settleRumor(rumorId);

        if (result) {
            res.json({ message: `Rumor settled as ${result}` });
        } else {
            res.status(400).json({ error: 'Rumor cannot be settled' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to settle rumor' });
    }
});

export default router;

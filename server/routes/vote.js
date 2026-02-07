import express from 'express';
import prisma from '../db.js';
import { VOTE_MULTIPLIER } from '../constants.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const { userId, rumorId, type } = req.body; // type: 1 (Verify) or -1 (Dispute)

    if (!userId || !rumorId || !type) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Calculate Weight
        // PRD: Weight = User.rep * 0.02
        const weight = user.reputation * VOTE_MULTIPLIER;

        // Create Vote
        // Prisma will throw uniqueness error if already voted
        const vote = await prisma.vote.create({
            data: {
                userId,
                rumorId,
                type: parseInt(type),
                weight
            }
        });

        // Update Rumor TrustScore
        // TrustScore changes by (type * weight)
        const delta = parseInt(type) * weight;

        const updatedRumor = await prisma.rumor.update({
            where: { id: rumorId },
            data: {
                trustScore: { increment: delta }
            }
        });

        res.json({ success: true, updatedScore: updatedRumor.trustScore });

    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: "Already voted" });
        }
        console.error(error);
        res.status(500).json({ error: "Vote failed" });
    }
});

export default router;

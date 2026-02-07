import express from 'express';
import prisma from '../db.js';
import {
    JITTER_MIN_MS,
    JITTER_MAX_MS,
    SETTLEMENT_TIME_MS,
    COST_POST_HIGH,
    COST_POST_LOW
} from '../constants.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const { content, userId } = req.body;

    if (!content || !userId) {
        return res.status(400).json({ error: "Missing content or userId" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Determine Cost
        const cost = user.reputation > 60 ? COST_POST_HIGH : COST_POST_LOW;

        // Deduct Reputation
        // We should probably check if they have enough rep? PRD doesn't explicitly say "fail if low rep", but "Deduct Cost".
        // 0 Rep shouldn't go negative? Or maybe it can. Assuming it can't for verified users?
        // Let's allow negative for now or clamp at 0. PRD says "0-100 Range".
        // "STARTING REP (0-100 Range)".
        let newRep = user.reputation - cost;
        if (newRep < 0) newRep = 0;

        await prisma.user.update({
            where: { id: userId },
            data: { reputation: newRep }
        });

        // Jitter Logic
        // visibleAt = Now + Random(1-60 mins)
        // For DEMO/QA purposes, maybe we want it SHORTER?
        // "The app must be demo-ready."
        // Users might want to see the post immediately?
        // PRD says verify "Jitter Wait". So I should keep the jitter.
        // The user flow says "Post Rumor -> Jitter Wait -> Vote".
        // I will generate the random jitter.
        const delay = Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)) + JITTER_MIN_MS;
        const now = Date.now();
        const visibleAt = new Date(now + delay);
        const settlesAt = new Date(now + SETTLEMENT_TIME_MS);

        const rumor = await prisma.rumor.create({
            data: {
                content,
                authorId: userId,
                visibleAt,
                settlesAt,
                status: 'TRIBUNAL',
                trustScore: 0.0
            }
        });

        res.json({ success: true, rumor, newReputation: newRep, visibleAt });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Post failed' });
    }
});

export default router;

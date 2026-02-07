import express from 'express';
import prisma from '../db.js';
import { REP_SENIOR, TRIBUNAL_DURATION_MS } from '../constants.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const { userId, filter } = req.query; // filter: 'active' (default), 'voted', 'results'

    if (!userId) {
        return res.status(400).json({ error: "userId required" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        const now = new Date();
        const isSenior = user.reputation >= REP_SENIOR;

        let where = {};

        if (filter === 'voted') {
            // SHOW RUMORS I VOTED ON (History)
            where = {
                votes: {
                    some: { userId: userId }
                }
            };
        } else if (filter === 'results') {
            // SHOW SETTLED OR REJECTED RUMORS
            where = {
                OR: [
                    { status: 'REJECTED' },
                    { status: 'SETTLED' },
                    // Or implicitly settled by time?
                    // PRD 4.4: Finalized when Time Limit (7 days) OR Vote Cap.
                    // Ideally the settlement worker updates status to SETTLED.
                    // But if worker hasn't run, we can check time.
                    { settlesAt: { lt: now } }
                ]
            };
        } else {
            // DEFAULT: ACTIVE FEED
            // 1. visibleAt < NOW
            // 2. status != REJECTED
            // 3. settlesAt > NOW
            where = {
                status: { notIn: ['REJECTED', 'SETTLED'] }, // simplistic status check
                settlesAt: { gt: now }
            };

            // Tribunal Visibility Logic (Only applies to Active Feed)
            if (isSenior) {
                where.visibleAt = { lt: now };
            } else {
                where.visibleAt = { lt: new Date(now.getTime() - TRIBUNAL_DURATION_MS) };
            }
        }

        const rumors = await prisma.rumor.findMany({
            where,
            orderBy: { visibleAt: 'desc' },
            take: 20
        });

        // Check if user has voted on them? Client might need that status.
        // Let's fetch votes for these rumors by this user efficiently.
        // Or just client fetches votes?
        // User Directive 1: "Happy Path". UI needs to know if I voted.
        // I'll attach `hasVoted` boolean or return separate list.

        // Let's include user's vote in the response
        const rumorsWithVote = await Promise.all(rumors.map(async (r) => {
            const vote = await prisma.vote.findUnique({
                where: {
                    userId_rumorId: {
                        userId,
                        rumorId: r.id
                    }
                }
            });
            return { ...r, vote: vote || null };
        }));

        res.json({ rumors: rumorsWithVote, isSenior });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Feed fetch failed" });
    }
});

export default router;

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // 1. Create Users

    // Seniors (Rep 90.0) - Implies Senior Role
    const senior1 = await prisma.user.create({ data: { reputation: 90.0 } });
    const senior2 = await prisma.user.create({ data: { reputation: 90.0 } });
    const senior3 = await prisma.user.create({ data: { reputation: 90.0 } });

    // Freshmen (Rep 40.0)
    const freshmen = [];
    for (let i = 0; i < 5; i++) {
        freshmen.push(await prisma.user.create({ data: { reputation: 40.0 } }));
    }

    // Bot (Rep 10.0)
    const bot = await prisma.user.create({ data: { reputation: 10.0 } });

    console.log('--- SENIOR USERS (Use for TRIBUNAL access) ---');
    console.log(`Senior 1: ${senior1.id}`);
    console.log(`Senior 2: ${senior2.id}`);
    console.log(`Senior 3: ${senior3.id}`);

    console.log('--- FRESHMAN USERS ---');
    freshmen.forEach((f, i) => console.log(`Freshman ${i + 1}: ${f.id}`));

    console.log('--- BOT USER ---');
    console.log(`Bot: ${bot.id}`);

    // 2. Create Rumors
    const now = new Date();

    // Rumor A: PUBLIC (Visible to all)
    // VisibleAt in the past (e.g., 3 hours ago) so Tribunal phase is over?
    // PRD: "After 2 hours, it opens to all users if not rejected."
    // So visibleAt = now - 3 hours. Status = PUBLIC.
    await prisma.rumor.create({
        data: {
            content: 'Rumor A: This is a PUBLIC rumor visible to everyone.',
            authorId: freshmen[0].id,
            status: 'PUBLIC',
            visibleAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
            settlesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    // Rumor B: TRIBUNAL (Visible only to Seniors)
    // VisibleAt in the immediate past (e.g., 10 mins ago).
    // Status = TRIBUNAL.
    await prisma.rumor.create({
        data: {
            content: 'Rumor B: This is a TRIBUNAL rumor visible only to SENIORS (Rep > 80).',
            authorId: freshmen[1].id,
            status: 'TRIBUNAL',
            visibleAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 mins ago
            settlesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    // Rumor C: JITTER (VisibleAt is 10 mins in future)
    // Status = TRIBUNAL (default), but not visible yet.
    await prisma.rumor.create({
        data: {
            content: 'Rumor C: This is a JITTER rumor. You should NOT see this yet.',
            authorId: freshmen[2].id,
            status: 'TRIBUNAL',
            visibleAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 mins in future
            settlesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

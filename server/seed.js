import prisma from './db.js';
import { REP_INITIAL, REP_SENIOR, TRIBUNAL_DURATION_MS } from './constants.js';

async function main() {
    console.log('Seeding Database...');

    // Cleanup
    await prisma.vote.deleteMany();
    await prisma.rumor.deleteMany();
    await prisma.user.deleteMany();

    // Create Users
    const freshman = await prisma.user.create({
        data: { id: 'user-freshman', reputation: REP_INITIAL, }
    });

    const senior = await prisma.user.create({
        data: { id: 'user-senior', reputation: REP_SENIOR + 5.0, }
    });

    console.log('Created Users:', { freshman: freshman.id, senior: senior.id });

    const now = Date.now();

    // 1. Public Rumor (Visible to All)
    // Visible > 2h ago
    await prisma.rumor.create({
        data: {
            content: "The Dean is actually three raccoons in a trench coat (Public)",
            authorId: senior.id,
            trustScore: 10.0,
            status: 'PUBLIC',
            visibleAt: new Date(now - TRIBUNAL_DURATION_MS - 3600000), // 3 hours ago
            settlesAt: new Date(now + 7 * 24 * 3600 * 1000)
        }
    });

    // 2. Tribunal Rumor (Visible only to Seniors)
    // Visible 30 mins ago (Within 2h window)
    await prisma.rumor.create({
        data: {
            content: "Tuition is increasing by 50% next semester (Tribunal Only)",
            authorId: freshman.id,
            trustScore: 0.0,
            status: 'TRIBUNAL',
            visibleAt: new Date(now - 30 * 60000), // 30 mins ago
            settlesAt: new Date(now + 7 * 24 * 3600 * 1000)
        }
    });

    // 3. Invisible Rumor (Jitter - Future)
    // Visible in 10 mins
    await prisma.rumor.create({
        data: {
            content: "There is secret tunnel under the library (Future)",
            authorId: freshman.id,
            trustScore: 0.0,
            status: 'TRIBUNAL',
            visibleAt: new Date(now + 10 * 60000),
            settlesAt: new Date(now + 7 * 24 * 3600 * 1000)
        }
    });

    console.log('Seeding Complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

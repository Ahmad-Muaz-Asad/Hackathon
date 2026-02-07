import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample rumor content variations
const rumorTemplates = [
    "The cafeteria is secretly serving recycled food from last week.",
    "Professor Ahmed gives extra marks if you mention his cat during exams.",
    "The library basement is haunted by a former librarian.",
    "WiFi password for the admin network is 'admin123'.",
    "The new dean is actually a robot powered by AI.",
    "Free pizza in room 404 every Friday at midnight.",
    "The campus fountain contains a time capsule from 1950.",
    "Security guards play poker in the janitor's closet after 10 PM.",
    "The student council embezzled funds for a secret party.",
    "Lab computers have hidden cryptocurrency miners installed.",
    "The vending machine on 3rd floor gives free snacks if you kick it.",
    "A professor was spotted at a rock concert instead of grading papers.",
    "The gym equipment is older than most students here.",
    "Someone found a secret tunnel under the chemistry building.",
    "The vice chancellor drives an invisible car to avoid parking fees.",
    "Exam papers are stored in the old abandoned building.",
    "The campus cat is actually a spy for the administration.",
    "Cafeteria chef has a Michelin star but hides it.",
    "There's a secret society that meets in the clock tower.",
    "The parking lot is built on an ancient burial ground.",
    "WiFi is faster in the bathroom stalls for some reason.",
    "The swimming pool has never been cleaned, just chlorinated.",
    "A student once lived in the library for a whole semester.",
    "The campus radio plays subliminal messages at night.",
    "There's a hidden coffee shop behind the bookshelf in the library."
];

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
    console.log('Starting large dataset seeding...');

    // Get all users
    const users = await prisma.user.findMany();
    if (users.length < 2) {
        console.log('Not enough users. Please run the main seed first.');
        return;
    }

    const seniors = users.filter(u => u.reputation >= 80);
    const freshmen = users.filter(u => u.reputation < 80 && u.reputation > 20);
    const allUsers = [...seniors, ...freshmen];

    console.log(`Found ${seniors.length} seniors and ${freshmen.length} freshmen`);

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    const rumorsToCreate = [];

    // Create 8 PUBLIC rumors (visible to all, tribunal phase over)
    for (let i = 0; i < 8; i++) {
        rumorsToCreate.push({
            content: `[PUBLIC] ${rumorTemplates[i % rumorTemplates.length]}`,
            authorId: randomElement(allUsers).id,
            status: 'PUBLIC',
            trustScore: randomInt(-20, 50) / 10,
            visibleAt: new Date(now - randomInt(3, 48) * HOUR), // 3-48 hours ago
            settlesAt: new Date(now + randomInt(1, 6) * DAY), // 1-6 days from now
        });
    }

    // Create 5 TRIBUNAL rumors (visible only to seniors, recent)
    for (let i = 0; i < 5; i++) {
        rumorsToCreate.push({
            content: `[TRIBUNAL] ${rumorTemplates[(i + 8) % rumorTemplates.length]}`,
            authorId: randomElement(allUsers).id,
            status: 'TRIBUNAL',
            trustScore: randomInt(-10, 30) / 10,
            visibleAt: new Date(now - randomInt(10, 90) * 60 * 1000), // 10-90 mins ago
            settlesAt: new Date(now + 7 * DAY),
        });
    }

    // Create 4 SETTLED rumors (finalized with verdict)
    for (let i = 0; i < 4; i++) {
        rumorsToCreate.push({
            content: `[SETTLED] ${rumorTemplates[(i + 13) % rumorTemplates.length]}`,
            authorId: randomElement(allUsers).id,
            status: 'SETTLED',
            trustScore: randomInt(10, 80) / 10, // Positive score = verified
            visibleAt: new Date(now - randomInt(2, 7) * DAY),
            settlesAt: new Date(now - randomInt(1, 24) * HOUR), // Already settled
        });
    }

    // Create 3 REJECTED rumors (disputed and rejected)
    for (let i = 0; i < 3; i++) {
        rumorsToCreate.push({
            content: `[REJECTED] ${rumorTemplates[(i + 17) % rumorTemplates.length]}`,
            authorId: randomElement(allUsers).id,
            status: 'REJECTED',
            trustScore: randomInt(-80, -20) / 10, // Negative score = disputed
            visibleAt: new Date(now - randomInt(3, 10) * DAY),
            settlesAt: new Date(now - randomInt(1, 48) * HOUR),
        });
    }

    // Create 3 JITTER rumors (not yet visible)
    for (let i = 0; i < 3; i++) {
        rumorsToCreate.push({
            content: `[JITTER/HIDDEN] ${rumorTemplates[(i + 20) % rumorTemplates.length]}`,
            authorId: randomElement(allUsers).id,
            status: 'TRIBUNAL',
            trustScore: 0,
            visibleAt: new Date(now + randomInt(5, 45) * 60 * 1000), // 5-45 mins in future
            settlesAt: new Date(now + 7 * DAY),
        });
    }

    console.log(`Creating ${rumorsToCreate.length} rumors...`);

    // Create all rumors
    const createdRumors = [];
    for (const rumorData of rumorsToCreate) {
        const rumor = await prisma.rumor.create({ data: rumorData });
        createdRumors.push(rumor);
        console.log(`Created: ${rumor.status} - ${rumor.content.slice(0, 40)}...`);
    }

    // Create random votes on visible rumors
    console.log('\nCreating random votes...');

    const visibleRumors = createdRumors.filter(r =>
        new Date(r.visibleAt) <= new Date() &&
        !['JITTER'].includes(r.status)
    );

    let voteCount = 0;
    for (const rumor of visibleRumors) {
        // Random number of voters (2-5 users per rumor)
        const numVoters = randomInt(2, Math.min(5, allUsers.length));
        const shuffledUsers = [...allUsers].sort(() => Math.random() - 0.5);
        const voters = shuffledUsers.slice(0, numVoters);

        for (const voter of voters) {
            // Skip if voter is the author
            if (voter.id === rumor.authorId) continue;

            const voteType = Math.random() > 0.4 ? 1 : -1; // 60% verify, 40% dispute
            const weight = voter.reputation * 0.02;

            try {
                await prisma.vote.create({
                    data: {
                        userId: voter.id,
                        rumorId: rumor.id,
                        type: voteType,
                        weight: weight
                    }
                });
                voteCount++;
            } catch (e) {
                // Ignore duplicate vote errors
                if (e.code !== 'P2002') console.error(e.message);
            }
        }
    }

    console.log(`\nCreated ${voteCount} votes across ${visibleRumors.length} rumors.`);
    console.log('\n=== SEEDING COMPLETE ===');
    console.log(`Total Rumors: ${createdRumors.length}`);
    console.log(`  - PUBLIC: 8`);
    console.log(`  - TRIBUNAL: 5`);
    console.log(`  - SETTLED: 4`);
    console.log(`  - REJECTED: 3`);
    console.log(`  - JITTER (hidden): 3`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

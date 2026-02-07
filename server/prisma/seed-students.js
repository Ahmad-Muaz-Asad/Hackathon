import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample student roll numbers for testing
const sampleStudents = [
    'l1234',
    'l1235',
    'l1236',
    'l1237',
    'l1238',
    'l2001',
    'l2002',
    'l2003',
    'l3001',
    'l3002'
];

async function main() {
    console.log('Seeding student records...\n');

    for (const rollNo of sampleStudents) {
        const email = `${rollNo}@lhr.nu.edu.pk`;

        const existing = await prisma.student.findUnique({
            where: { rollNo }
        });

        if (existing) {
            console.log(`[SKIP] ${rollNo} already exists`);
            continue;
        }

        await prisma.student.create({
            data: {
                rollNo,
                email,
                tokenClaimed: false
            }
        });

        console.log(`[CREATED] ${rollNo} -> ${email}`);
    }

    console.log('\n=== Student Seeding Complete ===');
    console.log(`Total students: ${sampleStudents.length}`);
    console.log('\nValid test emails:');
    sampleStudents.forEach(r => console.log(`  - ${r}@lhr.nu.edu.pk`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

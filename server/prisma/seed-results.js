import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating rumors to populate Results tab...');

    const rumors = await prisma.rumor.findMany();

    if (rumors.length > 0) {
        // Set first rumor to SETTLED
        await prisma.rumor.update({
            where: { id: rumors[0].id },
            data: { status: 'SETTLED', content: '[SETTLED] ' + rumors[0].content }
        });
        console.log(`Updated Rumor ${rumors[0].id} to SETTLED`);
    }

    if (rumors.length > 1) {
        // Set second rumor to REJECTED
        await prisma.rumor.update({
            where: { id: rumors[1].id },
            data: { status: 'REJECTED', content: '[REJECTED] ' + rumors[1].content }
        });
        console.log(`Updated Rumor ${rumors[1].id} to REJECTED`);
    }

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { fetchNestedPages, } from './use_cases/fetch_links.js';
import { predefPages } from './pages.js';
import { pino } from 'pino';
import { PrismaClient } from '@prisma/client';
// import * as to from 'await-to-js';
import { to } from 'await-to-js';
const prisma = new PrismaClient();
async function main() {
    /*const user = await prisma.notionPage.create({
      data: {
        notionId: 'ab296c7a-08b0-4347-b55e-3676f757a116',
        userId: '3f54071c-2d09-4334-b396-562251b35eac',
        name: 'Root',
      },
    })
    console.log(user)
    */
    const pages = await prisma.notionPage.findMany();
    console.log(pages);
}
export const logger = pino({
    name: 'app-name',
    level: 'debug',
    transport: {
        target: 'pino-pretty',
    },
});
async function bootstrap() {
    logger.info('Start Drilllist');
    logger.info('Sorter plugin');
    // await parseNestedPages();
    // await extractPageIdsFromRootPage();
    await main()
        .then(async () => {
        await prisma.$disconnect();
    })
        .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
    await fetchNestedPages(predefPages[0].pageId);
    // await fetchLinksNormalized('b4cc15aa-2489-41d5-9757-d77edaed6e91');
    // await fetchLinksAndRemoveDuplicates('771c4e11-9985-42ba-954f-1208921eb2f1');
    //await parseJsonLinksCreateDatabases('fb3fe219-282b-4de7-9c3d-1a098f29ea7e');
    // await loadLinksFromRoot();
    // await fetchLinksCheckAndWriteDB(predefDb[4].pageId);
    // await fetchLinksNormalized(predefDb[4].pageId);
}
bootstrap();
async function asyncTaskWithCb(cb) {
    let err, page, savedTask, notification;
    [err, page] = await to(prisma.notionPage.findMany());
    if (!page)
        return cb('No page found');
    //[err, savedTask] = await to(
    //  TaskModel({ userId: user.id, name: 'Demo Task' }),
    //);
    //if (err) return cb('Error occurred while saving task');
    //if (user.notificationsEnabled) {
    // [err] = await to(
    //   NotificationService.sendNotification(user.id, 'Task Created'),
    // );
    // if (err) return cb('Error while sending notification');
    //}
    /*
    if (savedTask.assignedUser.id !== user.id) {
      [err, notification] = await to(
        NotificationService.sendNotification(
          savedTask.assignedUser.id,
          'Task was created for you',
        ),
      );
      if (err) return cb('Error while sending notification');
    }*/
    cb(null, page);
}
async function asyncFunctionWithThrow() {
    const [err, page] = await to(prisma.notionPage.findMany());
    if (!page)
        throw new Error('Page not found');
}
const p = Promise.resolve({ test: 123 });
const [err, data] = await to(p);
console.log(data);

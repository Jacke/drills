import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';


async function bootstrap() {
  console.log('Start Drilllist');
  console.log('Sorter plugin');
  const app = await NestFactory.create(AppModule);
  await app.listen(3002);

}
bootstrap();

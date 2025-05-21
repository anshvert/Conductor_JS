import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SimulatedFunctionsModule } from './simulated-functions/simulated-functions.module';
import { KafkaProducerModule } from './kafka/kafka-producer.module';
import { RedisAppModule } from './redis/redis.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, // Makes ConfigService available throughout the app
        }),
        WorkflowsModule,
        SimulatedFunctionsModule,
        KafkaProducerModule,
        RedisAppModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}

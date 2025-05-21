import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { SimulatedFunctionsModule } from '../simulated-functions/simulated-functions.module';
import { KafkaProducerModule } from '../kafka/kafka-producer.module'; // Ensure this is correctly named
import { RedisAppModule } from '../redis/redis.module';       // Ensure this is correctly named

@Module({
    imports: [
        SimulatedFunctionsModule,
        KafkaProducerModule,
        RedisAppModule,
    ],
    controllers: [WorkflowsController],
    providers: [WorkflowsService, WorkflowEngineService],
    exports: [WorkflowsService, WorkflowEngineService],
})

export class WorkflowsModule {}
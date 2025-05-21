import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerService } from './kafka-producer.service';

export const KAFKA_SERVICE_NAME = 'KAFKA_PRODUCER_SERVICE';

@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: KAFKA_SERVICE_NAME,
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => ({
                    transport: Transport.KAFKA,
                    options: {
                        client: {
                            clientId: configService.get<string>('KAFKA_CLIENT_ID'),
                            brokers: [configService.get<string>('KAFKA_BROKER')],
                        },
                        consumer: {
                            groupId: configService.get<string>('KAFKA_GROUP_ID') || 'orchestrator-producer-group',
                        },
                        producer: {
                            allowAutoTopicCreation: true, // For dev convenience
                        }
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    providers: [KafkaProducerService],
    exports: [KafkaProducerService],
})

export class KafkaProducerModule {}
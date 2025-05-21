import { Inject, Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { KAFKA_SERVICE_NAME } from './kafka-producer.module';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnApplicationShutdown {
    constructor(
        @Inject(KAFKA_SERVICE_NAME) private readonly kafkaClient: ClientKafka,
        private readonly configService: ConfigService,
    ) {}

    async onModuleInit() {
        try {
            // For ClientKafka, connect() is called automatically when a message is first sent
            // or when subscribing to reply topics. However, explicit connect can be useful for early failure detection.
            await this.kafkaClient.connect();
            console.log('Kafka Producer connected successfully.');
        } catch (error) {
            console.error('Failed to connect Kafka Producer:', error);
        }
    }

    async onApplicationShutdown() {
        await this.kafkaClient.close();
        console.log('Kafka Producer disconnected.');
    }

    async sendMessage(topic: string, message: any): Promise<void> {
        try {
            // console.log(`Sending message to Kafka topic ${topic}:`, message);
            // emit does not wait for a response, send does (if the topic is configured for replies)
            this.kafkaClient.emit(topic, JSON.stringify(message));
        } catch (error) {
            console.error(`Error sending message to Kafka topic ${topic}:`, error);
            // Add more robust error handling/retry logic if needed
        }
    }
}
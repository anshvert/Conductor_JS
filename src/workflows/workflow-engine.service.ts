import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowsService } from './workflows.service';
import { SimulatedFunctionsService } from '../simulated-functions/simulated-functions.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { RedisAppService } from '../redis/redis.service';
import {
    WorkflowInstance,
    WorkflowInstanceStatus,
    StepExecutionRecord,
} from './interfaces/workflow-instance.interface';
import { WorkflowDefinition } from './interfaces/workflow-definition.interface';
import {  WorkflowStep  } from "./interfaces/workflow-step.interface"
import { TriggerWorkflowDto } from './dto/trigger-workflow.dto';

// Basic utility for deep access/setting in objects (simplified JSONPath)
// For robust solution, use a library like 'object-path' or 'jsonpath-plus'
const getPath = (obj: any, path: string | undefined): any => {
    if (!path || path === '$' || path === '$.') return obj;
    // Assuming path like "$.a.b.c" or "a.b.c"
    const keys = path.replace(/^\$\.?/, '').split('.');
    let current = obj;
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return undefined; // Path does not exist
        }
    }
    return current;
};

const setPath = (obj: any, path: string | undefined, value: any): any => {
    if (!path || path === '$' || path === '$.') {
        // If root path, merge or replace based on whether value is an object
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return { ...obj, ...value };
        }
        return value; // Replace root if value is not a mergable object
    }

    const keys = path.replace(/^\$\.?/, '').split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {}; // Create path if it doesn't exist
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
};


@Injectable()
export class WorkflowEngineService {
    private readonly logger = new Logger(WorkflowEngineService.name);
    private readonly WORKFLOW_INSTANCE_KEY_PREFIX = 'workflow_instance:';
    private readonly KAFKA_TOPIC_EVENTS = 'workflow_events';
    // private readonly KAFKA_TOPIC_STEP_TRIGGERS = 'workflow_step_triggers'; // For future event-driven step execution

    constructor(
        private readonly workflowsService: WorkflowsService,
        private readonly simulatedFunctionsService: SimulatedFunctionsService,
        private readonly kafkaProducer: KafkaProducerService,
        private readonly redisService: RedisAppService,
    ) {}

    private async saveInstance(instance: WorkflowInstance): Promise<void> {
        await this.redisService.set(`<span class="math-inline">\{this\.WORKFLOW\_INSTANCE\_KEY\_PREFIX\}</span>{instance.instanceId}`, instance);
    }

    async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance | null> {
        return this.redisService.get<WorkflowInstance>(`<span class="math-inline">\{this\.WORKFLOW\_INSTANCE\_KEY\_PREFIX\}</span>{instanceId}`);
    }

    async triggerWorkflow(
        workflowIdOrName: string,
        triggerDto: TriggerWorkflowDto,
    ): Promise<WorkflowInstance> {
        let definition: WorkflowDefinition | undefined = await this.workflowsService.findOne(workflowIdOrName)
            .catch(() => undefined); // Try finding by ID first

        if (!definition) {
            definition = await this.workflowsService.findByName(workflowIdOrName); // Then try by name
        }

        if (!definition) {
            throw new NotFoundException(
                `Workflow definition with ID or Name "${workflowIdOrName}" not found.`,
            );
        }

        const instanceId = uuidv4();
        const now = new Date().toISOString();

        const initialInstance: WorkflowInstance = {
            instanceId,
            workflowDefinitionId: definition.id,
            workflowDefinitionName: definition.name,
            status: WorkflowInstanceStatus.PENDING,
            initialPayload: triggerDto.payload || {},
            currentPayload: triggerDto.payload || {}, // Start with initial payload
            currentStepId: definition.startAt,
            history: [],
            startedAt: now,
        };

        await this.saveInstance(initialInstance);
        this.logger.log(`Workflow instance <span class="math-inline">\{instanceId\} \(</span>{definition.name}) created and PENDING.`);
        await this.kafkaProducer.sendMessage(this.KAFKA_TOPIC_EVENTS, {
            type: 'WORKFLOW_STARTED',
            instanceId,
            workflowDefinitionId: definition.id,
            workflowName: definition.name,
            startedAt: now,
            initialPayload: initialInstance.initialPayload,
        });

        // Start execution asynchronously (don't await this)
        this.processWorkflowInstance(instanceId, definition);

        return initialInstance; // Return immediately
    }

    private async processWorkflowInstance(instanceId: string, definition?: WorkflowDefinition): Promise<void> {
        let instance = await this.getWorkflowInstance(instanceId);
        if (!instance) {
            this.logger.error(`Instance ${instanceId} not found in Redis for processing.`);
            return;
        }

        if (instance.status !== WorkflowInstanceStatus.PENDING && instance.status !== WorkflowInstanceStatus.RUNNING) {
            this.logger.warn(`Instance <span class="math-inline">\{instanceId\} is not in a runnable state \(</span>{instance.status}). Aborting.`);
            return;
        }

        // Ensure definition is available
        if (!definition) {
            definition = await this.workflowsService.findOne(instance.workflowDefinitionId);
            if (!definition) {
                this.logger.error(`Workflow definition ${instance.workflowDefinitionId} for instance ${instanceId} not found.`);
                instance.status = WorkflowInstanceStatus.FAILED;
                instance.error = `Critical: Workflow definition ${instance.workflowDefinitionId} missing.`;
                instance.endedAt = new Date().toISOString();
                await this.saveInstance(instance);
                await this.kafkaProducer.sendMessage(this.KAFKA_TOPIC_EVENTS, {
                    type: 'WORKFLOW_FAILED', instanceId, error: instance.error, endedAt: instance.endedAt,
                });
                return;
            }
        }


        if (instance.status === WorkflowInstanceStatus.PENDING) {
            instance.status = WorkflowInstanceStatus.RUNNING;
            await this.saveInstance(instance);
        }

        let currentStepId = instance.currentStepId;

        while (currentStepId && instance.status === WorkflowInstanceStatus.RUNNING) {
            const stepDefinition = definition.steps[currentStepId];
            if (!stepDefinition) {
                this.logger.error(`Step ${currentStepId} not found in workflow ${definition.name} for instance ${instanceId}.`);
                instance.status = WorkflowInstanceStatus.FAILED;
                instance.error = `Step definition for ${currentStepId} missing.`;
                break;
            }

            const stepExecutionRecord: Partial<StepExecutionRecord> = {
                stepId: currentStepId,
                functionName: stepDefinition.functionName,
                startedAt: new Date().toISOString(),
                input: undefined, // Will be set below
            };

            try {
                // 1. Prepare Input
                const functionInput = getPath(instance.currentPayload, stepDefinition.inputPath);
                stepExecutionRecord.input = JSON.parse(JSON.stringify(functionInput ?? {})); // Deep clone for logging

                this.logger.log(`[${instanceId}] Executing step: <span class="math-inline">\{stepDefinition\.name\} \(</span>{currentStepId}) with input: ${JSON.stringify(functionInput)}`);
                await this.kafkaProducer.sendMessage(this.KAFKA_TOPIC_EVENTS, {
                    type: 'STEP_STARTED', instanceId, stepId: currentStepId, stepName: stepDefinition.name,
                    functionName: stepDefinition.functionName, input: functionInput, startedAt: stepExecutionRecord.startedAt
                });


                // 2. Execute Function
                // @ts-ignore (this is a common way to dynamically call methods if you trust functionName)
                const funcToExecute = this.simulatedFunctionsService[stepDefinition.functionName];
                if (typeof funcToExecute !== 'function') {
                    throw new Error(`Simulated function "${stepDefinition.functionName}" not found or not a function.`);
                }
                const output = await funcToExecute.call(this.simulatedFunctionsService, functionInput);


                // 3. Process Output
                instance.currentPayload = setPath(instance.currentPayload, stepDefinition.resultPath, output);
                stepExecutionRecord.output = JSON.parse(JSON.stringify(output ?? {})); // Deep clone for logging
                stepExecutionRecord.status = 'SUCCESS';
                stepExecutionRecord.endedAt = new Date().toISOString();
                this.logger.log(`[${instanceId}] Step ${stepDefinition.name} COMPLETED. Output: ${JSON.stringify(output)}`);
                await this.kafkaProducer.sendMessage(this.KAFKA_TOPIC_EVENTS, {
                    type: 'STEP_COMPLETED', instanceId, stepId: currentStepId, stepName: stepDefinition.name,
                    output, endedAt: stepExecutionRecord.endedAt
                });

                instance.history.push(stepExecutionRecord as StepExecutionRecord);
                currentStepId = stepDefinition.nextStepId; // Move to next step
                instance.currentStepId = currentStepId;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`[${instanceId}] Step ${stepDefinition.name} FAILED: ${errorMessage}`, error.stack);
                stepExecutionRecord.status = 'ERROR';
                stepExecutionRecord.error = errorMessage;
                stepExecutionRecord.endedAt = new Date().toISOString();

                instance.history.push(stepExecutionRecord as StepExecutionRecord);
                instance.status = WorkflowInstanceStatus.FAILED;
                instance.error = `Error in step ${stepDefinition.name}: ${errorMessage}`;
                instance.currentStepId = stepDefinition.id; // Mark failing step
                await this.kafkaProducer.sendMessage(this.KAFKA_TOPIC_EVENTS, {
                    type: 'STEP_FAILED', instanceId, stepId: currentStepId, stepName: stepDefinition.name,
                    error: errorMessage, endedAt: stepExecutionRecord.endedAt
                });
                break; // Stop workflow execution
            } finally {
                await this.saveInstance(instance); // Save after each step attempt
            }
        } // End while loop

        // Finalize workflow status if not already failed
        if (instance.status === WorkflowInstanceStatus.RUNNING) {
            if (!currentStepId) { // No next step means completion
                instance.status = WorkflowInstanceStatus.COMPLETED;
                this.logger.log(`[${instanceId}] Workflow ${definition.name} COMPLETED successfully.`);
                await this.kafkaProducer.sendMessage(this.KAFKA_TOPIC_EVENTS, {
                    type: 'WORKFLOW_COMPLETED', instanceId, workflowName: definition.name, endedAt: new Date().toISOString()
                });
            }
            // If currentStepId exists but loop exited, it's an unexpected state (should have been handled by fail)
            // This might happen if a step definition is missing for a nextStepId
        }

        instance.endedAt = new Date().toISOString();
        await this.saveInstance(instance);

        if (instance.status === WorkflowInstanceStatus.FAILED) {
            this.logger.error(`[${instanceId}] Workflow ${definition.name} FAILED. Final error: ${instance.error}`);
            await this.kafkaProducer.sendMessage(this.KAFKA_TOPIC_EVENTS, {
                type: 'WORKFLOW_FAILED', instanceId, workflowName: definition.name,
                error: instance.error, endedAt: instance.endedAt
            });
        }
    }
}
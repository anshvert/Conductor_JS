import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { WorkflowDefinition } from './interfaces/workflow-definition.interface';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkflowsService {
    // In-memory store for workflow definitions. Replace with DB/Redis for persistence.
    private readonly workflowDefinitions: Map<string, WorkflowDefinition> = new Map();

    constructor() {
        // Load a sample workflow definition
        this.loadSampleWorkflow();
    }

    private loadSampleWorkflow() {
        const sampleWorkflow: WorkflowDefinition = {
            id: 'sample-user-signup',
            name: 'Sample User Signup Workflow',
            description: 'A sample workflow to demonstrate user signup process.',
            startAt: 'validateInput',
            steps: {
                validateInput: {
                    id: 'validateInput',
                    name: 'Validate User Input',
                    type: 'function' as any, // Cast for simplicity, use StepType enum
                    functionName: 'validateUserData',
                    // inputPath: '$.initialPayload', // Example: takes the whole initial payload
                    resultPath: '$.validationResult', // Stores output in instance.currentPayload.validationResult
                    nextStepId: 'createUser',
                },
                createUser: {
                    id: 'createUser',
                    name: 'Create User in DB',
                    type: 'function' as any,
                    functionName: 'createUserInDB',
                    inputPath: '$.validationResult', // Takes output from previous step
                    resultPath: '$.userCreationResult',
                    nextStepId: 'sendEmail',
                },
                sendEmail: {
                    id: 'sendEmail',
                    name: 'Send Welcome Email',
                    type: 'function' as any,
                    functionName: 'sendWelcomeEmail',
                    inputPath: '$.userCreationResult',
                    resultPath: '$.emailSentResult',
                    nextStepId: 'logAnalytics',
                },
                logAnalytics: {
                    id: 'logAnalytics',
                    name: 'Log Signup Analytics',
                    type: 'function' as any,
                    functionName: 'logAnalytics',
                    inputPath: '$.emailSentResult', // Could take a broader scope too
                    // resultPath: '$.analyticsLogResult', // Optional: if you need its output
                    nextStepId: null, // End of workflow
                },
            },
        };
        this.workflowDefinitions.set(sampleWorkflow.id, sampleWorkflow);
        console.log(`Loaded sample workflow: ${sampleWorkflow.name}`);
    }


    async create(dto: CreateWorkflowDefinitionDto): Promise<WorkflowDefinition> {
        // Basic check if a workflow with the same name exists to avoid simple duplicates by name
        // For a robust system, ID generation and collision should be handled more carefully
        const existingByName = Array.from(this.workflowDefinitions.values()).find(def => def.name === dto.name);
        if (existingByName) {
            throw new ConflictException(`Workflow definition with name "${dto.name}" already exists.`);
        }

        const id = uuidv4(); // Or generate a slug from the name
        const workflowDefinition: WorkflowDefinition = {
            id,
            ...dto,
            // createdAt: new Date(),
            // updatedAt: new Date(),
        };
        // TODO: Add deep validation of steps, nextStepId coherence etc.
        this.workflowDefinitions.set(id, workflowDefinition);
        console.log(`Created workflow definition: ${id} - ${workflowDefinition.name}`);
        return workflowDefinition;
    }

    async findAll(): Promise<WorkflowDefinition[]> {
        return Array.from(this.workflowDefinitions.values());
    }

    async findOne(id: string): Promise<WorkflowDefinition> {
        const definition = this.workflowDefinitions.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow definition with ID "${id}" not found.`);
        }
        return definition;
    }

    async findByName(name: string): Promise<WorkflowDefinition | undefined> {
        return Array.from(this.workflowDefinitions.values()).find(def => def.name === name);
    }


    async update(id: string, dto: Partial<CreateWorkflowDefinitionDto>): Promise<WorkflowDefinition> {
        let definition = await this.findOne(id);
        definition = { ...definition, ...dto, id /*, updatedAt: new Date() */ };
        this.workflowDefinitions.set(id, definition);
        return definition;
    }

    async remove(id: string): Promise<void> {
        if (!this.workflowDefinitions.delete(id)) {
            throw new NotFoundException(`Workflow definition with ID "${id}" not found for deletion.`);
        }
    }
}
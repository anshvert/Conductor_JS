import { WorkflowDefinition } from './workflow-definition.interface';

export enum WorkflowInstanceStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    TIMED_OUT = 'TIMED_OUT', // Future
    CANCELLED = 'CANCELLED', // Future
}

export interface StepExecutionRecord {
    stepId: string;
    functionName: string;
    status: 'SUCCESS' | 'ERROR';
    startedAt: string;
    endedAt: string;
    input: any;
    output?: any;
    error?: string;
    attempts?: number; // For retries
}

export interface WorkflowInstance {
    instanceId: string;
    workflowDefinitionId: string; // Reference to the definition used
    workflowDefinitionName: string; // For easier identification
    status: WorkflowInstanceStatus;
    initialPayload: any;
    currentPayload: any; // The evolving data object passed between steps
    currentStepId?: string | null; // ID of the step currently being processed or last processed
    history: StepExecutionRecord[];
    startedAt: string;
    endedAt?: string;
    error?: string; // Overall workflow error if it fails entirely
}
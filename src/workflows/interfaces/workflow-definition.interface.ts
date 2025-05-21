import { WorkflowStep } from './workflow-step.interface';

export interface WorkflowDefinition {
    id: string; // Unique ID for the workflow definition
    name: string; // Human-readable name of the workflow
    description?: string;
    startAt: string; // ID of the first step
    steps: Record<string, WorkflowStep>; // Keyed by step ID
    // version?: number; // Optional versioning
    // createdAt?: Date;
    // updatedAt?: Date;
}
import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowStep } from '../interfaces/workflow-step.interface';

// This DTO can be more detailed to validate step structures.
// For simplicity, we'll keep it high-level for now and rely on the interface.
class WorkflowStepDto implements Omit<WorkflowStep, 'id'> { // id will be key in the steps object
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString() // Using enum string for now, can add @IsEnum(StepType)
    @IsNotEmpty()
    type: string; // Should be StepType

    @IsString()
    @IsNotEmpty()
    functionName: string;

    @IsOptional()
    @IsString()
    inputPath?: string;

    @IsOptional()
    @IsString()
    resultPath?: string;

    @IsOptional()
    @IsString()
    nextStepId?: string | null;
}


export class CreateWorkflowDefinitionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    @IsNotEmpty()
    startAt: string; // ID of the first step

    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => WorkflowStepDto) // This won't work directly for Record<string, WorkflowStepDto>
                                 // For complex nested validation on Record<string, object>, you might need custom validators
                                 // or validate manually in the service.
                                 // For now, we'll assume structure is correct or do basic validation.
    steps: Record<string, WorkflowStep>; // Keyed by step ID
}
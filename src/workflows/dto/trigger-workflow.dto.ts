import { IsObject, IsOptional } from 'class-validator';

export class TriggerWorkflowDto {
    @IsObject()
    @IsOptional()
    payload?: any;
}
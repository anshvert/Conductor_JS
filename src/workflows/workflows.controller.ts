import { Controller, Post, Body, Get, Param, Put, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow.dto';
import { TriggerWorkflowDto } from './dto/trigger-workflow.dto';
import { WorkflowDefinition } from './interfaces/workflow-definition.interface';
import { WorkflowInstance } from './interfaces/workflow-instance.interface';

@Controller('workflows')
export class WorkflowsController {
    constructor(
        private readonly workflowsService: WorkflowsService,
        private readonly workflowEngineService: WorkflowEngineService,
    ) {}

    // --- Workflow Definition Management ---
    @Post('definitions')
    @HttpCode(HttpStatus.CREATED)
    async createDefinition(@Body() createWorkflowDto: CreateWorkflowDefinitionDto): Promise<WorkflowDefinition> {
        return this.workflowsService.create(createWorkflowDto);
    }

    @Get('definitions')
    async findAllDefinitions(): Promise<WorkflowDefinition[]> {
        return this.workflowsService.findAll();
    }

    @Get('definitions/:id')
    async findOneDefinition(@Param('id') id: string): Promise<WorkflowDefinition> {
        return this.workflowsService.findOne(id);
    }

    @Put('definitions/:id')
    async updateDefinition(
        @Param('id') id: string,
        @Body() updateWorkflowDto: Partial<CreateWorkflowDefinitionDto>,
    ): Promise<WorkflowDefinition> {
        return this.workflowsService.update(id, updateWorkflowDto);
    }

    @Delete('definitions/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeDefinition(@Param('id') id: string): Promise<void> {
        return this.workflowsService.remove(id);
    }

    // --- Workflow Instance Management & Triggering ---
    @Post(':idOrName/trigger')
    @HttpCode(HttpStatus.ACCEPTED) // Accepted for async processing
    async triggerWorkflow(
        @Param('idOrName') idOrName: string,
        @Body() triggerDto: TriggerWorkflowDto,
    ): Promise<WorkflowInstance> { // Returns initial instance state
        return this.workflowEngineService.triggerWorkflow(idOrName, triggerDto);
    }

    @Get('instances/:instanceId')
    async getWorkflowInstance(@Param('instanceId') instanceId: string): Promise<WorkflowInstance | null> {
        return this.workflowEngineService.getWorkflowInstance(instanceId);
    }
}
import { Module } from '@nestjs/common';
import { SimulatedFunctionsService } from './simulated-functions.service';

@Module({
    providers: [SimulatedFunctionsService],
    exports: [SimulatedFunctionsService], // Export to be used by WorkflowEngineService
})

export class SimulatedFunctionsModule {}
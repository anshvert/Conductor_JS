export enum StepType {
    FUNCTION = 'function', // Standard function call
    // Could add other types later: CHOICE, PARALLEL, WAIT
}

export interface WorkflowStep {
    id: string; // Unique ID for this step within the workflow
    name: string; // Human-readable name
    type: StepType;
    functionName: string; // Name of the function in SimulatedFunctionsService
    inputPath?: string; // JSONPath to extract input from overall workflow data (e.g., "$.trigger.body", "$.steps.previousStepId.output")
    // If undefined, passes the full current payload.
    resultPath?: string; // JSONPath to store the output of this step in the overall workflow data (e.g., "$.results.stepId")
    // If undefined, merges output into the root of the payload.
    nextStepId?: string | null; // ID of the next step; null if it's the last step
    // errorHandling?: {
    //   retries?: number;
    //   catch?: [{ errorEquals: string[], nextStepId: string }];
    // };
}
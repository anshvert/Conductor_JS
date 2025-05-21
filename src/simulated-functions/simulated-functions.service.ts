import { Injectable } from '@nestjs/common';

@Injectable()
export class SimulatedFunctionsService {
    async validateUserData(data: any): Promise<any> {
        console.log('[SimulatedFunction] Validating user data:', data);
        if (!data || !data.email || !data.password) {
            throw new Error('Validation Error: Email and password are required.');
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async work
        return { ...data, validated: true, validationTimestamp: new Date().toISOString() };
    }

    async createUserInDB(data: any): Promise<any> {
        console.log('[SimulatedFunction] Creating user in DB with data:', data);
        if (!data.validated) {
            throw new Error('User data not validated before DB creation attempt.');
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
        const userId = `user_${Date.now()}`;
        return { ...data, userId, dbTimestamp: new Date().toISOString() };
    }

    async sendWelcomeEmail(data: any): Promise<any> {
        console.log(`[SimulatedFunction] Sending welcome email to: ${data.email} for user ID: ${data.userId}`);
        if (!data.userId || !data.email) {
            throw new Error('Cannot send email without userId and email.');
        }
        await new Promise(resolve => setTimeout(resolve, 700)); // Simulate async work
        return { ...data, emailSent: true, emailSentTimestamp: new Date().toISOString() };
    }

    async logAnalytics(data: any): Promise<any> {
        console.log('[SimulatedFunction] Logging analytics:', data);
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async work
        return { ...data, analyticsLogged: true };
    }

    // Add more simulated functions as needed
    async makeExternalApiCall(data: any): Promise<any> {
        console.log('[SimulatedFunction] Making external API call with:', data);
        // In a real scenario, use HttpService or fetch
        await new Promise(resolve => setTimeout(resolve, 1200));
        return { ...data, externalResponse: { status: 200, data: 'mock_api_response' } };
    }
}
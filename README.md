# Conductor.js: Local Serverless Workflow Orchestrator

**Conductor.js** is a Node.js/NestJS application that simulates a serverless function orchestrator, akin to services like AWS Step Functions or Azure Logic Apps, but designed to run locally. It allows users to define, manage, and execute sequences of "functions" (simulated as internal logic or API calls) based on triggers.

This project explores concepts of workflow automation, function chaining, event-driven architecture, and abstracting business logic into composable, manageable units.

## Unique Factors & Core Concepts

* **Workflow Automation:** Define and automate multi-step processes using a JSON-based workflow definition.
* **Function Chaining:** Sequentially execute "functions," passing output from one step as input to the next.
* **Local Simulation:** Mimics cloud-native orchestration services locally, ideal for development, testing, and understanding orchestration patterns without incurring cloud costs.
* **Event-Driven Principles:** Utilizes Kafka for emitting events related to workflow and step lifecycles (e.g., workflow started, step completed, workflow failed).
* **State Management:** Leverages Redis to maintain the state of each running workflow instance, ensuring resilience and allowing for inspection.
* **Composable Logic:** Business logic is broken down into smaller, reusable "simulated functions."

## Tech Stack

* **Backend:** Node.js, NestJS (TypeScript)
* **Messaging:** Apache Kafka (for event emission)
* **State Store:** Redis
* **Containerization:** Docker (for Kafka & Redis services)
* **Core Libraries:**
    * `@nestjs/microservices` (for Kafka integration)
    * `ioredis` (for Redis client)
    * `kafkajs` (underlying Kafka client)
    * `class-validator`, `class-transformer` (for DTO validation)
    * `uuid` (for generating unique IDs)

## Key Features

* **Workflow Definition:** Define workflows using a JSON structure, specifying steps, function names, input/output paths, and sequential flow.
* **API-driven Management:**
    * CRUD operations for workflow definitions.
    * Endpoints to trigger workflow executions.
    * Endpoint to retrieve the status and history of workflow instances.
* **Simulated Function Execution:** A registry of predefined TypeScript functions that the orchestrator can call.
* **Sequential Step Execution:** Processes workflow steps one after another as defined.
* **Data Transformation:** Basic input/output mapping between steps using simplified path expressions (e.g., `$.initialPayload.data`, `$.steps.previousStep.output`).
* **Persistent Workflow State:** Workflow instance progress, payload, and history are stored in Redis.
* **Event Emission:** Key workflow lifecycle events (start, step completion/failure, end) are published to Kafka topics.
* **Asynchronous Execution:** Workflow triggers return quickly, and the actual execution happens in the background.

## Project Setup & Installation

### Prerequisites

* Node.js (v18.x or later recommended)
* npm or yarn
* Docker and Docker Compose

### Steps

1.  **Clone the Repository:**
    ```bash
    git clone <https://github.com/anshvert/Conductor_JS.git>
    cd serverless-orchestrator # Or your chosen project directory name
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the project root by copying `.env.example` (if you create one) or by creating it manually with the following content:
    ```env
    PORT=3000
    REDIS_HOST=localhost
    REDIS_PORT=6379
    KAFKA_BROKER=localhost:9092
    KAFKA_CLIENT_ID=conductor-app
    KAFKA_GROUP_ID=conductor-group
    ```

4.  **Start External Services (Kafka & Redis):**
    Ensure Docker is running and then execute:
    ```bash
    docker-compose up -d
    ```
    This will start Kafka and Redis in detached mode. You can check their status with `docker-compose ps` or logs with `docker-compose logs kafka` / `docker-compose logs redis`.
    The `docker-compose.yml` file includes Kafka topic creation for `workflow_events` and `workflow_step_triggers`.

## Running the Application

Once the dependencies are installed and external services are running:

```bash
npm run start:dev
```

---

## API Endpoints Overview

(Assuming default port `3000`)

### Workflow Definitions

| Method | Endpoint                          | Description                                  |
| :----- | :-------------------------------- | :------------------------------------------- |
| `POST` | `/workflows/definitions`          | Create a new workflow definition.            |
| `GET`  | `/workflows/definitions`          | List all workflow definitions.               |
| `GET`  | `/workflows/definitions/:id`      | Get details of a specific workflow definition. |
| `PUT`  | `/workflows/definitions/:id`      | Update a workflow definition.                |
| `DELETE` | `/workflows/definitions/:id`    | Delete a workflow definition.                |

### Workflow Execution & Instances

| Method | Endpoint                              | Description                                                                                                                                              |
| :----- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/workflows/:idOrName/trigger`        | Trigger a workflow by its ID or name. <br/> **Body**: `{ "payload": { ...initial data for the workflow... } }` <br/> **Response**: `202 Accepted` with initial workflow instance data. |
| `GET`  | `/workflows/instances/:instanceId`    | Get the current state and history of a specific workflow instance.                                                                                       |

---

## Example Workflow Definition

A sample workflow definition (like `sample-user-signup` auto-loaded or one you create) might look like this:

```json
{
  "name": "User Signup Process",
  "description": "Handles new user registration, email, and analytics.",
  "startAt": "validateUserInput",
  "steps": {
    "validateUserInput": {
      "id": "validateUserInput",
      "name": "Validate User Input Data",
      "type": "function",
      "functionName": "validateUserData",
      "inputPath": ".initialPayload",
      "resultPath": ".validationOutput",
      "nextStepId": "createUserRecord"
    },
    "createUserRecord": {
      "id": "createUserRecord",
      "name": "Create User in Database",
      "type": "function",
      "functionName": "createUserInDB",
      "inputPath": ".validationOutput",
      "resultPath": ".userRecord",
      "nextStepId": "sendWelcomeNotification"
    },
    "sendWelcomeNotification": {
      "id": "sendWelcomeNotification",
      "name": "Send Welcome Email",
      "type": "function",
      "functionName": "sendWelcomeEmail",
      "inputPath": ".userRecord",
      "resultPath": ".emailStatus",
      "nextStepId": null
    }
  }
}
```
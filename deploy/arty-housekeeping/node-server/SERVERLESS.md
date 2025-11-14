# Serverless + RDS Deployment Guide

This document outlines a low-effort path to run the Node.js API server in a serverless environment and use Amazon RDS (Postgres) for canonical data storage.

Options
- AWS Lambda + API Gateway (recommended for production serverless)
- Vercel Serverless Functions (easy for Next.js + small APIs)

High-level steps (AWS Lambda + RDS)
1. Provision an Amazon RDS PostgreSQL instance (use a private subnet with a security group allowing the Lambda function's VPC). Note connection details: host, port, user, password, database.
2. Create a Lambda function and set runtime to Node.js LTS. For VPC access to RDS, configure the Lambda to run in the same VPC/subnets and assign a security group that can reach RDS.
3. Package the Node server as a Lambda-compatible app. Two approaches:
   - Use the Serverless Framework (`serverless`) or AWS SAM: create a `serverless.yml` or `template.yml` mapping an HTTP endpoint to your handler.
   - Or container image: build a small Docker image containing the Node server and deploy to Lambda as a container.
4. Environment variables: configure `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (or `DATABASE_URL`) in Lambda configuration. Also set `PORT` if needed (Lambda will use API Gateway mapping).
5. Use RDS proxy (recommended) between Lambda and RDS for connection pooling to avoid exhausting DB connections.
6. Deploy and test the preview API: `POST /api/adapters/{vendor}/preview` and webhook endpoints.

Security and networking
- Place RDS in private subnets; do not expose it publicly.
- Configure a security group allowing inbound Postgres from Lambda or RDS Proxy SG only.
- Use AWS Secrets Manager to store DB credentials and mount them as environment variables in Lambda.

Simple Serverless Framework example (conceptual)
```yaml
service: arty-housekeeping
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
functions:
  api:
    handler: index.handler # if using a Lambda handler wrapper
    events:
      - httpApi: '*'
resources: {}
```

Notes on Vercel
- If you plan a Next.js frontend, host it on Vercel and move the mapping preview API into a Vercel Serverless Function (`/api/preview`). For production APIs that require DB access and VPC, prefer AWS Lambda + RDS.

Operational notes
- Use RDS automated backups and Multi-AZ for high availability.
- Use monitoring (CloudWatch) for Lambda and RDS metrics.
- Use RDS Proxy for connection management.

Security & hardening checklist
- Sanitize and validate all inputs server-side. Use packages like `express-validator` or `validator` to check parameters.
- Use `helmet` to set secure HTTP headers and `express-rate-limit` to protect APIs from abuse.
- Store DB credentials in AWS Secrets Manager and reference them in environment variables; do not hard-code secrets.
- Use IAM least-privilege: Lambda execution role should only have permissions needed (e.g., read Secrets Manager, RDS connect via Proxy). Avoid attaching broad admin roles.
- Enable VPC/subnet isolation for RDS and restrict access via security groups. Use RDS Proxy to reduce connection exhaustion from serverless functions.
- Monitor logs (CloudWatch + GuardDuty) and configure alerts for unusual traffic, failed auth attempts, or elevated error rates.
- Rotate credentials regularly and maintain an incident response plan and rollback strategy for faulty adapter changes.


Fallback and development
- For local development, use the provided `.env.example` and a local Postgres (e.g., Docker image). The Node server will fall back to file-based storage if DB is not configured.

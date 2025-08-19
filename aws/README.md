# AWS Deployment Guide for ShiftWise

This guide provides multiple options for deploying ShiftWise to AWS, from simple EC2 deployment to fully managed container services.

## Deployment Options

1. **EC2 + Docker Compose** - Simple, cost-effective for small to medium deployments
2. **ECS with Fargate** - Serverless containers, managed scaling
3. **EKS** - Full Kubernetes orchestration for complex deployments
4. **Elastic Beanstalk** - Platform-as-a-Service option

## Quick Start

Choose your deployment method:

### Option 1: EC2 + Docker Compose (Recommended for getting started)
```bash
cd aws/ec2
./deploy-ec2.sh
```

### Option 2: ECS with Fargate (Recommended for production)
```bash
cd aws/ecs
./deploy-ecs.sh
```

### Option 3: EKS (For advanced Kubernetes users)
```bash
cd aws/eks
./deploy-eks.sh
```

## Prerequisites

1. **AWS CLI** installed and configured
2. **AWS Account** with appropriate permissions
3. **Domain name** (optional but recommended)
4. **SSL Certificate** (can be generated via AWS Certificate Manager)

## Setup Instructions

1. Configure AWS credentials:
```bash
aws configure
```

2. Choose your deployment method and follow the specific guide in the respective directory.

## Cost Estimation

| Deployment Type | Monthly Cost (USD) | Use Case |
|----------------|-------------------|----------|
| EC2 t3.medium | $30-50 | Development/Small teams |
| ECS Fargate | $50-100 | Production/Medium scale |
| EKS | $100-200+ | Enterprise/Large scale |

## Support

Each deployment option includes:
- Infrastructure as Code (CloudFormation/Terraform)
- Automated deployment scripts
- Monitoring and logging setup
- Backup and disaster recovery
- Security best practices
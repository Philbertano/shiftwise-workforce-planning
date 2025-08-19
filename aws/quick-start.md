# AWS Quick Start Guide

This guide will get you up and running with ShiftWise on AWS in under 30 minutes.

## Prerequisites

1. **AWS Account** with administrative access
2. **AWS CLI** installed and configured
3. **Docker** installed (for ECS deployment)
4. **Domain name** (optional but recommended)

## Option 1: EC2 Deployment (Simplest)

Perfect for development, testing, or small production deployments.

### Step 1: Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd shiftwise-workforce-planning

# Configure AWS CLI
aws configure
```

### Step 2: Deploy
```bash
cd aws/ec2
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

### Step 3: Access
The script will output:
- Public IP address
- SSH command
- Application URL

**Estimated time:** 10-15 minutes  
**Monthly cost:** ~$30-50

## Option 2: ECS Fargate (Recommended for Production)

Fully managed, scalable container deployment.

### Step 1: Setup
```bash
# Ensure Docker is running
docker --version

# Navigate to ECS deployment
cd aws/ecs
chmod +x deploy-ecs.sh
```

### Step 2: Deploy
```bash
./deploy-ecs.sh
```

### Step 3: Access
The script will output:
- Load Balancer DNS name
- Application URL
- CloudWatch dashboard link

**Estimated time:** 20-30 minutes  
**Monthly cost:** ~$50-100

## Post-Deployment Steps

### 1. Configure Domain (Optional)
If you have a domain name:

```bash
# Get your load balancer DNS from the deployment output
# Create a CNAME record pointing your domain to the load balancer DNS
```

### 2. Setup SSL Certificate
```bash
# Request SSL certificate via AWS Certificate Manager
aws acm request-certificate \
    --domain-name your-domain.com \
    --validation-method DNS \
    --region us-east-1

# Note the certificate ARN and redeploy with SSL
export SSL_CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
./deploy-ecs.sh  # or ./deploy-ec2.sh
```

### 3. Initial Configuration
1. Access your application URL
2. Create your first admin user
3. Configure employee data and skills
4. Set up shift templates and stations

## Monitoring and Maintenance

### View Logs
```bash
# EC2 deployment
ssh -i your-key.pem ec2-user@your-ip
docker-compose logs -f

# ECS deployment
aws logs tail /ecs/shiftwise-api --follow
```

### Scale Services (ECS only)
```bash
# Scale API service
aws ecs update-service \
    --cluster shiftwise-cluster \
    --service shiftwise-service-api \
    --desired-count 4

# Scale Frontend service
aws ecs update-service \
    --cluster shiftwise-cluster \
    --service shiftwise-service-frontend \
    --desired-count 2
```

### Backup Database
```bash
# EC2 deployment
./scripts/deploy.sh backup

# ECS deployment
# Automated backups are enabled by default
# Manual backup via RDS console or CLI
```

## Troubleshooting

### Common Issues

1. **Deployment fails with permissions error**
   ```bash
   # Ensure your AWS user has sufficient permissions
   aws iam attach-user-policy --user-name your-username --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
   ```

2. **Application not accessible**
   ```bash
   # Check security groups allow HTTP/HTTPS traffic
   # Verify load balancer health checks are passing
   ```

3. **Database connection issues**
   ```bash
   # Check RDS security group allows connections from ECS
   # Verify database credentials in task definition
   ```

### Getting Help

1. Check CloudWatch logs for application errors
2. Review CloudFormation events for infrastructure issues
3. Use AWS support or community forums for AWS-specific issues

## Cost Optimization

### EC2 Deployment
- Use t3.small for development (saves ~50%)
- Enable detailed monitoring only when needed
- Use Spot instances for non-critical workloads

### ECS Deployment
- Use Fargate Spot for cost savings (up to 70% off)
- Right-size your containers based on actual usage
- Enable auto-scaling to handle traffic spikes efficiently

## Security Best Practices

1. **Change default passwords** in environment files
2. **Enable SSL/TLS** for production deployments
3. **Restrict security groups** to necessary ports only
4. **Enable CloudTrail** for audit logging
5. **Use IAM roles** instead of access keys where possible

## Next Steps

Once deployed, you can:
1. Import your employee and skill data
2. Configure shift templates and stations
3. Set up automated planning schedules
4. Integrate with your existing HR systems
5. Customize the UI to match your branding

For advanced configuration and customization, refer to the detailed deployment guides in each deployment option's directory.
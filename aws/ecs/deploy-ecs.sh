#!/bin/bash

# ShiftWise ECS Fargate Deployment Script
# This script deploys ShiftWise to AWS ECS using Fargate

set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME=${CLUSTER_NAME:-shiftwise-cluster}
SERVICE_NAME=${SERVICE_NAME:-shiftwise-service}
DOMAIN_NAME=${DOMAIN_NAME:-}
SSL_CERT_ARN=${SSL_CERT_ARN:-}
ECR_REPOSITORY=${ECR_REPOSITORY:-shiftwise}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        echo_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    echo_info "Prerequisites check passed!"
}

# Create ECR repositories
create_ecr_repositories() {
    echo_info "Creating ECR repositories..."
    
    # Create API repository
    aws ecr describe-repositories --repository-names "${ECR_REPOSITORY}-api" --region "$REGION" &> /dev/null || \
    aws ecr create-repository --repository-name "${ECR_REPOSITORY}-api" --region "$REGION"
    
    # Create Frontend repository
    aws ecr describe-repositories --repository-names "${ECR_REPOSITORY}-frontend" --region "$REGION" &> /dev/null || \
    aws ecr create-repository --repository-name "${ECR_REPOSITORY}-frontend" --region "$REGION"
    
    echo_info "ECR repositories created successfully!"
}

# Build and push Docker images
build_and_push_images() {
    echo_info "Building and pushing Docker images..."
    
    # Get ECR login token
    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${REGION}.amazonaws.com"
    
    # Build and push API image
    echo_info "Building API image..."
    docker build -t "${ECR_REPOSITORY}-api" -f ../../Dockerfile ../../
    docker tag "${ECR_REPOSITORY}-api:latest" "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY}-api:latest"
    docker push "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY}-api:latest"
    
    # Build and push Frontend image
    echo_info "Building Frontend image..."
    docker build -t "${ECR_REPOSITORY}-frontend" -f ../../frontend/Dockerfile ../../frontend/
    docker tag "${ECR_REPOSITORY}-frontend:latest" "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY}-frontend:latest"
    docker push "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY}-frontend:latest"
    
    echo_info "Docker images pushed successfully!"
}

# Deploy infrastructure
deploy_infrastructure() {
    echo_info "Deploying ECS infrastructure..."
    
    aws cloudformation deploy \
        --template-file cloudformation-ecs.yml \
        --stack-name shiftwise-ecs \
        --parameter-overrides \
            ClusterName="$CLUSTER_NAME" \
            ServiceName="$SERVICE_NAME" \
            ECRRepository="$ECR_REPOSITORY" \
            DomainName="$DOMAIN_NAME" \
            SSLCertificateArn="$SSL_CERT_ARN" \
        --capabilities CAPABILITY_IAM \
        --region "$REGION"
    
    echo_info "Infrastructure deployed successfully!"
}

# Update ECS service
update_service() {
    echo_info "Updating ECS service..."
    
    # Force new deployment
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --force-new-deployment \
        --region "$REGION"
    
    echo_info "Service update initiated!"
}

# Get service information
get_service_info() {
    echo_info "Getting service information..."
    
    LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks \
        --stack-name shiftwise-ecs \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    echo_info "Load Balancer DNS: $LOAD_BALANCER_DNS"
}

# Setup monitoring
setup_monitoring() {
    echo_info "Setting up CloudWatch monitoring..."
    
    # Create CloudWatch dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "ShiftWise-ECS" \
        --dashboard-body file://cloudwatch-dashboard.json \
        --region "$REGION"
    
    echo_info "Monitoring setup completed!"
}

# Main deployment function
main() {
    echo_info "Starting ShiftWise ECS deployment..."
    
    check_prerequisites
    create_ecr_repositories
    build_and_push_images
    deploy_infrastructure
    update_service
    get_service_info
    setup_monitoring
    
    echo_info "Deployment completed successfully!"
    echo_info "Access your application at: http://$LOAD_BALANCER_DNS"
    
    if [ -n "$DOMAIN_NAME" ]; then
        echo_info "Don't forget to point your domain $DOMAIN_NAME to $LOAD_BALANCER_DNS"
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    build)
        check_prerequisites
        create_ecr_repositories
        build_and_push_images
        ;;
    update)
        update_service
        ;;
    destroy)
        echo_warn "Destroying infrastructure..."
        aws cloudformation delete-stack --stack-name shiftwise-ecs --region "$REGION"
        echo_info "Stack deletion initiated. This may take a few minutes."
        ;;
    status)
        aws cloudformation describe-stacks --stack-name shiftwise-ecs --region "$REGION"
        ;;
    *)
        echo "Usage: $0 {deploy|build|update|destroy|status}"
        exit 1
        ;;
esac
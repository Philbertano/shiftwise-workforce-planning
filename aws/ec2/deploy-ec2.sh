#!/bin/bash

# ShiftWise EC2 Deployment Script
# This script deploys ShiftWise to an EC2 instance using Docker Compose

set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.medium}
KEY_PAIR_NAME=${KEY_PAIR_NAME:-shiftwise-key}
DOMAIN_NAME=${DOMAIN_NAME:-}
SSL_CERT_ARN=${SSL_CERT_ARN:-}

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
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    echo_info "Prerequisites check passed!"
}

# Create key pair if it doesn't exist
create_key_pair() {
    echo_info "Checking for key pair: $KEY_PAIR_NAME"
    
    if ! aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$REGION" &> /dev/null; then
        echo_info "Creating key pair: $KEY_PAIR_NAME"
        aws ec2 create-key-pair \
            --key-name "$KEY_PAIR_NAME" \
            --region "$REGION" \
            --query 'KeyMaterial' \
            --output text > "${KEY_PAIR_NAME}.pem"
        chmod 400 "${KEY_PAIR_NAME}.pem"
        echo_info "Key pair created and saved as ${KEY_PAIR_NAME}.pem"
    else
        echo_info "Key pair already exists"
    fi
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    echo_info "Deploying infrastructure..."
    
    aws cloudformation deploy \
        --template-file cloudformation-ec2.yml \
        --stack-name shiftwise-ec2 \
        --parameter-overrides \
            InstanceType="$INSTANCE_TYPE" \
            KeyPairName="$KEY_PAIR_NAME" \
            DomainName="$DOMAIN_NAME" \
            SSLCertificateArn="$SSL_CERT_ARN" \
        --capabilities CAPABILITY_IAM \
        --region "$REGION"
    
    echo_info "Infrastructure deployed successfully!"
}

# Get instance information
get_instance_info() {
    echo_info "Getting instance information..."
    
    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --stack-name shiftwise-ec2 \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
        --output text)
    
    PUBLIC_IP=$(aws cloudformation describe-stacks \
        --stack-name shiftwise-ec2 \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
        --output text)
    
    echo_info "Instance ID: $INSTANCE_ID"
    echo_info "Public IP: $PUBLIC_IP"
}

# Deploy application
deploy_application() {
    echo_info "Deploying application to EC2 instance..."
    
    # Wait for instance to be ready
    echo_info "Waiting for instance to be ready..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"
    
    # Give it a bit more time for SSH to be ready
    sleep 30
    
    # Copy deployment files
    echo_info "Copying deployment files..."
    scp -i "${KEY_PAIR_NAME}.pem" -o StrictHostKeyChecking=no \
        -r ../../* ec2-user@"$PUBLIC_IP":/home/ec2-user/shiftwise/
    
    # Run deployment on instance
    echo_info "Running deployment on instance..."
    ssh -i "${KEY_PAIR_NAME}.pem" -o StrictHostKeyChecking=no \
        ec2-user@"$PUBLIC_IP" << 'EOF'
cd /home/ec2-user/shiftwise

# Setup environment
cp .env.production .env
sed -i "s/your-secure-password/$(openssl rand -base64 32)/g" .env
sed -i "s/your-super-secret-jwt-key/$(openssl rand -base64 64)/g" .env

# Deploy with Docker Compose
chmod +x scripts/deploy.sh
./scripts/deploy.sh deploy

# Setup monitoring
chmod +x scripts/monitoring.sh
./scripts/monitoring.sh setup

echo "Deployment completed successfully!"
EOF
    
    echo_info "Application deployed successfully!"
}

# Setup monitoring and logging
setup_monitoring() {
    echo_info "Setting up CloudWatch monitoring..."
    
    # Install CloudWatch agent on instance
    ssh -i "${KEY_PAIR_NAME}.pem" -o StrictHostKeyChecking=no \
        ec2-user@"$PUBLIC_IP" << 'EOF'
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -c file:/home/ec2-user/shiftwise/aws/ec2/cloudwatch-config.json -s
EOF
    
    echo_info "Monitoring setup completed!"
}

# Main deployment function
main() {
    echo_info "Starting ShiftWise EC2 deployment..."
    
    check_prerequisites
    create_key_pair
    deploy_infrastructure
    get_instance_info
    deploy_application
    setup_monitoring
    
    echo_info "Deployment completed successfully!"
    echo_info "Access your application at: http://$PUBLIC_IP"
    
    if [ -n "$DOMAIN_NAME" ]; then
        echo_info "Don't forget to point your domain $DOMAIN_NAME to $PUBLIC_IP"
    fi
    
    echo_info "SSH access: ssh -i ${KEY_PAIR_NAME}.pem ec2-user@$PUBLIC_IP"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    destroy)
        echo_warn "Destroying infrastructure..."
        aws cloudformation delete-stack --stack-name shiftwise-ec2 --region "$REGION"
        echo_info "Stack deletion initiated. This may take a few minutes."
        ;;
    status)
        aws cloudformation describe-stacks --stack-name shiftwise-ec2 --region "$REGION"
        ;;
    *)
        echo "Usage: $0 {deploy|destroy|status}"
        exit 1
        ;;
esac
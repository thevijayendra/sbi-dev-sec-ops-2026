# ─────────────────────────────────────────────────────────────────────────────
#  EMS Infrastructure — Terraform Configuration
#  ⚠️  THIS FILE CONTAINS INTENTIONAL MISCONFIGURATIONS FOR LAB 4
#
#  Find all the security problems before running Checkov.
#  After scanning, fix them using the patterns in Module 7.
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ⚠️  MISCONFIGURATION: state stored locally — should be in encrypted S3 + DynamoDB
  # backend "s3" {
  #   bucket         = "sbi-ems-tfstate"
  #   key            = "ems/terraform.tfstate"
  #   region         = "ap-south-1"
  #   encrypt        = true
  #   dynamodb_table = "sbi-ems-tflock"
  # }
}

provider "aws" {
  region = "ap-south-1"   # Mumbai — data residency for Indian banking
}

# ─────────────────────────────────────────────────────────────────────────────
#  Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
  # ⚠️  MISCONFIGURATION: in a real setup, never pass this via CLI — use Vault or AWS Secrets Manager
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "sbi-ems"
}

# ─────────────────────────────────────────────────────────────────────────────
#  VPC & Networking (simplified)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_vpc" "ems_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.app_name}-vpc"
    Environment = var.environment
    Project     = "ems"
  }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.ems_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-south-1a"
  tags = { Name = "${var.app_name}-public-a" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.ems_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "ap-south-1a"
  tags = { Name = "${var.app_name}-private-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.ems_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "ap-south-1b"
  tags = { Name = "${var.app_name}-private-b" }
}

resource "aws_db_subnet_group" "ems_db_subnets" {
  name       = "${var.app_name}-db-subnets"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  tags = { Name = "${var.app_name}-db-subnet-group" }
}

# ─────────────────────────────────────────────────────────────────────────────
#  Security Groups
# ─────────────────────────────────────────────────────────────────────────────

# ⚠️  MISCONFIGURATION 1: Overly permissive — allows ALL inbound traffic from internet
resource "aws_security_group" "ems_app_sg" {
  name        = "${var.app_name}-app-sg"
  description = "Security group for EMS application"
  vpc_id      = aws_vpc.ems_vpc.id

  ingress {
    description = "Allow all inbound"
    from_port   = 0
    to_port     = 65535
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]   # ⚠️  SHOULD be restricted to ALB SG + known CIDR only
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.app_name}-app-sg", Environment = var.environment }
}

resource "aws_security_group" "ems_rds_sg" {
  name        = "${var.app_name}-rds-sg"
  description = "Security group for EMS RDS instance"
  vpc_id      = aws_vpc.ems_vpc.id

  ingress {
    description     = "MySQL from app"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ems_app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.app_name}-rds-sg", Environment = var.environment }
}

# ─────────────────────────────────────────────────────────────────────────────
#  RDS MySQL
# ─────────────────────────────────────────────────────────────────────────────

# ⚠️  MISCONFIGURATION 2: Database is publicly accessible from the internet
# ⚠️  MISCONFIGURATION 3: Storage not encrypted at rest
# ⚠️  MISCONFIGURATION 4: No deletion protection
# ⚠️  MISCONFIGURATION 5: No Multi-AZ (RBI BCM requirement — Lab 4 custom policy)
resource "aws_db_instance" "ems_mysql" {
  identifier        = "${var.app_name}-db"
  engine            = "mysql"
  engine_version    = "8.0"
  instance_class    = "db.t3.medium"
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = "ems"
  username = "admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.ems_db_subnets.name
  vpc_security_group_ids = [aws_security_group.ems_rds_sg.id]

  publicly_accessible = true      # ⚠️  SHOULD be false
  storage_encrypted   = false     # ⚠️  SHOULD be true
  deletion_protection = false     # ⚠️  SHOULD be true in production
  skip_final_snapshot = true      # ⚠️  SHOULD be false in production
  multi_az            = false     # ⚠️  SHOULD be true (RBI BCM — CKV_SBI_001)

  backup_retention_period = 7
  backup_window           = "02:00-03:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  tags = {
    Name        = "${var.app_name}-db"
    Environment = var.environment
    Project     = "ems"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
#  S3 Bucket — EMS Reports
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "ems_reports" {
  bucket = "sbi-${var.app_name}-reports-${var.environment}"

  tags = {
    Name        = "${var.app_name}-reports"
    Environment = var.environment
    Project     = "ems"
  }
}

# ⚠️  MISCONFIGURATION 6: Public ACL — all employee reports visible to internet
resource "aws_s3_bucket_acl" "ems_reports_acl" {
  bucket = aws_s3_bucket.ems_reports.id
  acl    = "public-read"   # ⚠️  SHOULD be "private" + public access block
}

# ⚠️  MISCONFIGURATION 7: No server-side encryption on S3
# (missing aws_s3_bucket_server_side_encryption_configuration)

# ⚠️  MISCONFIGURATION 8: No public access block
# (missing aws_s3_bucket_public_access_block)

# ─────────────────────────────────────────────────────────────────────────────
#  Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.ems_mysql.endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 reports bucket name"
  value       = aws_s3_bucket.ems_reports.bucket
}

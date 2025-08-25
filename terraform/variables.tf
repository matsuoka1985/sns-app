variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "sns-app"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  # 実際のドメインに変更する必要があります
  # example: "yourdomain.com"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "ecr_repository_url" {
  description = "ECR repository URL for Laravel app"
  type        = string
  # 事前にECRで作成したリポジトリURL
  # example: "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/sns-app"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "app_key" {
  description = "Laravel app key"
  type        = string
  sensitive   = true
}

variable "firebase_credentials" {
  description = "Firebase service account credentials (base64 encoded JSON)"
  type        = string
  sensitive   = true
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = string
  # example: "https://yourapp.vercel.app,https://yourdomain.com"
}

variable "frontend_url" {
  description = "Frontend URL"
  type        = string
  # example: "https://yourapp.vercel.app"
}
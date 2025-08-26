variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "social-app"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "production"
}

variable "ecr_repository_url" {
  description = "ECR repository URL for Laravel app"
  type        = string
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
}

variable "frontend_url" {
  description = "Frontend URL"
  type        = string
}
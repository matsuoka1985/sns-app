variable "project_name" {
  description = "Project name"
  type        = string
  default     = "social-app"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL for the application"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "app_key" {
  description = "Laravel app key"
  type        = string
  sensitive   = true
}

variable "firebase_credentials" {
  description = "Firebase service account credentials JSON"
  type        = string
  sensitive   = true
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = string
  default     = "*"
}

variable "frontend_url" {
  description = "Frontend URL"
  type        = string
}
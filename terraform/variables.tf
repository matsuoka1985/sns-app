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

variable "ecr_repository_url" {
  description = "ECR repository URL for the application"
  type        = string
}
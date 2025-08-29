output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.main.name
}

output "task_definition_arn" {
  description = "ECS task definition ARN"
  value       = aws_ecs_task_definition.main.arn
}

output "app_ecr_repository_url" {
  description = "Laravel app ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "nginx_ecr_repository_url" {
  description = "Nginx ECR repository URL"
  value       = aws_ecr_repository.nginx.repository_url
}

output "security_group_id" {
  description = "ECS security group ID"
  value       = aws_security_group.ecs.id
}